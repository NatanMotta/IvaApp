// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

const SUBSCRIPTION_ACTIVE_STATUSES = new Set(['active', 'trialing']);
const SUBSCRIPTION_KNOWN_STATUSES = new Set([
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]);

function textEncoder(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function computeStripeSignature(payload: string, timestamp: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signedPayload = `${timestamp}.${payload}`;
  const sigBuffer = await crypto.subtle.sign('HMAC', key, textEncoder(signedPayload));
  return toHex(new Uint8Array(sigBuffer));
}

async function verifyStripeWebhookSignature(payload: string, signatureHeader: string, secret: string) {
  // Stripe-Signature: t=1700000000,v1=<sig>,v0=<old_sig>
  const elements = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = elements.find((part) => part.startsWith('t='))?.slice(2);
  const signatureV1 = elements.find((part) => part.startsWith('v1='))?.slice(3);

  if (!timestamp || !signatureV1) return false;

  const expected = await computeStripeSignature(payload, timestamp, secret);
  return timingSafeEqual(expected, signatureV1);
}

function extractCustomerId(obj: Record<string, unknown>): string | null {
  const candidate = obj.customer;
  return typeof candidate === 'string' && candidate ? candidate : null;
}

function extractSubscriptionId(obj: Record<string, unknown>): string | null {
  const candidate = obj.subscription;
  return typeof candidate === 'string' && candidate ? candidate : null;
}

function extractUnixTimestampSeconds(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key];
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return new Date(value * 1000).toISOString();
  }
  return null;
}

function normalizeTierFromPriceId(priceId: string | null): 'free' | 'pro' {
  // Fallback strategy: any known paid price maps to pro.
  // You can make this stricter by checking against STRIPE_PRO_PRICE_IDS.
  if (!priceId) return 'free';
  return 'pro';
}

function extractPriceIdFromSubscriptionObject(obj: Record<string, unknown>): string | null {
  const items = obj.items as { data?: Array<Record<string, unknown>> } | undefined;
  const first = items?.data?.[0];
  const price = first?.price as Record<string, unknown> | undefined;
  const id = price?.id;
  return typeof id === 'string' ? id : null;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Missing Stripe signature', { status: 400 });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });
    }

    const payload = await req.text();
    const verified = await verifyStripeWebhookSignature(payload, signature, webhookSecret);
    if (!verified) {
      return new Response('Invalid Stripe signature', { status: 400 });
    }

    const event = JSON.parse(payload) as StripeEvent;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response('Missing Supabase service credentials', { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const object = event.data.object;
    const customerId = extractCustomerId(object);
    const subscriptionId = extractSubscriptionId(object);

    if (event.type === 'checkout.session.completed') {
      const clientReferenceId = object.client_reference_id;
      const userId = typeof clientReferenceId === 'string' ? clientReferenceId : null;
      const currentPeriodEnd = extractUnixTimestampSeconds(object, 'expires_at');

      if (userId) {
        const update = {
          subscription_tier: 'pro',
          subscription_status: 'active',
          subscription_provider: 'stripe',
          subscription_customer_id: customerId,
          subscription_current_period_end: currentPeriodEnd,
          stripe_subscription_id: subscriptionId,
        };

        const { error } = await admin.from('profiles').update(update).eq('id', userId);
        if (error) {
          console.error('checkout.session.completed update error', error);
          return new Response('DB update failed', { status: 500 });
        }
      }
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscriptionStatusRaw = object.status;
      const subscriptionStatus =
        typeof subscriptionStatusRaw === 'string' && SUBSCRIPTION_KNOWN_STATUSES.has(subscriptionStatusRaw)
          ? subscriptionStatusRaw
          : 'inactive';

      const periodEnd = extractUnixTimestampSeconds(object, 'current_period_end');
      const priceId = extractPriceIdFromSubscriptionObject(object);

      const tier = SUBSCRIPTION_ACTIVE_STATUSES.has(subscriptionStatus)
        ? normalizeTierFromPriceId(priceId)
        : 'free';

      if (customerId) {
        const { error } = await admin
          .from('profiles')
          .update({
            subscription_tier: tier,
            subscription_status: subscriptionStatus,
            subscription_provider: 'stripe',
            subscription_current_period_end: periodEnd,
            stripe_subscription_id: typeof object.id === 'string' ? object.id : subscriptionId,
          })
          .eq('subscription_customer_id', customerId);

        if (error) {
          console.error('customer.subscription.* update error', error);
          return new Response('DB update failed', { status: 500 });
        }
      }
    } else if (event.type === 'invoice.payment_failed') {
      if (customerId) {
        const { error } = await admin
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            subscription_provider: 'stripe',
          })
          .eq('subscription_customer_id', customerId);

        if (error) {
          console.error('invoice.payment_failed update error', error);
          return new Response('DB update failed', { status: 500 });
        }
      }
    } else {
      // Ignore other events and acknowledge.
    }

    return new Response(JSON.stringify({ received: true, event: event.type }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('stripe-webhook error', error);
    return new Response('Internal server error', { status: 500 });
  }
});
