import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { hasProAccess, type SubscriptionStatus, type SubscriptionTier } from '../lib/entitlements';

export type Entitlements = {
  userId: string | null;
  email: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  hasPro: boolean;
};

export function useEntitlements() {
  return useQuery({
    queryKey: ['entitlements'],
    queryFn: async (): Promise<Entitlements> => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return {
          userId: null,
          email: null,
          tier: 'free',
          status: 'inactive',
          hasPro: false,
        };
      }

      const user = authData.user;

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const tierValue = profileRow?.subscription_tier;
      const statusValue = profileRow?.subscription_status;

      const tier: SubscriptionTier = tierValue === 'pro' ? 'pro' : 'free';
      const status: SubscriptionStatus = (
        statusValue === 'trialing' ||
        statusValue === 'active' ||
        statusValue === 'past_due' ||
        statusValue === 'canceled'
      ) ? statusValue : 'inactive';

      return {
        userId: user.id,
        email: user.email ?? null,
        tier,
        status,
        hasPro: hasProAccess({ tier, status }),
      };
    },
    staleTime: 1000 * 60,
  });
}
