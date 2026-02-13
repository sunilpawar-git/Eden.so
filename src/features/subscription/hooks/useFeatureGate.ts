/**
 * useFeatureGate - Generic feature gating hook
 * Returns whether the current user has access to a gated feature.
 * SOLID SRP: Only checks feature access, no side effects.
 */
import { useSubscriptionStore } from '../stores/subscriptionStore';
import type { GatedFeature } from '../types/subscription';

interface FeatureGateResult {
    hasAccess: boolean;
    isLoading: boolean;
    tier: string;
}

export function useFeatureGate(feature: GatedFeature): FeatureGateResult {
    const hasAccess = useSubscriptionStore((s) => s.hasAccess(feature));
    const isLoading = useSubscriptionStore((s) => s.isLoading);
    const tier = useSubscriptionStore((s) => s.tier);

    return { hasAccess, isLoading, tier };
}
