// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function toStripeBody(params: Record<string, string>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.append(key, value);
  }
  return body.toString();
}

async function stripeRequest(
  endpoint: string,
  secretKey: string,
  params: Record<string, string>,
) {
  const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: toStripeBody(params),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || 'Stripe request failed';
    throw new Error(message);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeProPriceId = Deno.env.get('STRIPE_PRO_PRICE_ID');
    const defaultSuccessUrl = Deno.env.get('STRIPE_SUCCESS_URL');
    const defaultCancelUrl = Deno.env.get('STRIPE_CANCEL_URL');
    const defaultPortalReturnUrl = Deno.env.get('STRIPE_BILLING_RETURN_URL');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response('Missing Supabase env vars', {
        status: 500,
        headers: CORS_HEADERS,
      });
    }

    if (!stripeSecretKey || !stripeProPriceId) {
      return new Response('Missing Stripe env vars', {
        status: 500,
        headers: CORS_HEADERS,
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Missing authorization header', {
        status: 401,
        headers: CORS_HEADERS,
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response('Unauthorized', {
        status: 401,
        headers: CORS_HEADERS,
      });
    }

    const user = authData.user;
    const payload = await req.json().catch(() => ({}));
    const successUrl = payload?.successUrl || defaultSuccessUrl;
    const cancelUrl = payload?.cancelUrl || defaultCancelUrl || successUrl;
    const portalReturnUrl = payload?.portalReturnUrl || defaultPortalReturnUrl || successUrl;

    if (!successUrl || !cancelUrl) {
      return new Response('Missing success/cancel URL', {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id,email,nome,subscription_status,subscription_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response('Profile not found', {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    let customerId = profile.subscription_customer_id as string | null;
    if (!customerId) {
      const createdCustomer = await stripeRequest('customers', stripeSecretKey, {
        email: profile.email || user.email || '',
        name: profile.nome || user.user_metadata?.nome || '',
        'metadata[supabase_user_id]': user.id,
      });

      customerId = createdCustomer.id as string;

      const { error: updateCustomerError } = await adminClient
        .from('profiles')
        .update({
          subscription_provider: 'stripe',
          subscription_customer_id: customerId,
        })
        .eq('id', user.id);

      if (updateCustomerError) {
        return new Response('Failed to persist Stripe customer', {
          status: 500,
          headers: CORS_HEADERS,
        });
      }
    }

    const hasSubscription = ['active', 'trialing', 'past_due'].includes(profile.subscription_status || '');

    if (hasSubscription) {
      const portal = await stripeRequest('billing_portal/sessions', stripeSecretKey, {
        customer: customerId,
        return_url: portalReturnUrl,
      });

      return new Response(
        JSON.stringify({
          mode: 'portal',
          url: portal.url,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      );
    }

    const checkoutSession = await stripeRequest('checkout/sessions', stripeSecretKey, {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      'line_items[0][price]': stripeProPriceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: 'true',
      origin_context: 'mobile_app',
      'metadata[supabase_user_id]': user.id,
      'subscription_data[metadata][supabase_user_id]': user.id,
    });

    return new Response(
      JSON.stringify({
        mode: 'checkout',
        url: checkoutSession.url,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unexpected error',
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    );
  }
});
