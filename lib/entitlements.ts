import type { Modulo } from '../hooks/useModuli';

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled';

export function hasProAccess(input: { tier: SubscriptionTier; status: SubscriptionStatus }): boolean {
  return input.tier === 'pro' && (input.status === 'active' || input.status === 'trialing');
}

export function canAccessModulo(modulo: Modulo | null | undefined, hasPro: boolean): boolean {
  if (!modulo) return false;
  if (!modulo.is_premium) return true;
  return hasPro;
}
