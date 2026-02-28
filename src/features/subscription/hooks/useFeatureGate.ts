/**
 * useFeatureGate - Generic feature gating hook
 * Returns whether the current user has access to a gated feature.
 * SOLID SRP: Only checks feature access, no side effects.
 */
import { useMemo } from 'react';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { hasFeatureAccess, type GatedFeature } from '../types/subscription';

interface FeatureGateResult {
    hasAccess: boolean;
    isLoading: boolean;
    tier: string;
}

export function useFeatureGate(feature: GatedFeature): FeatureGateResult {
    const tier = useSubscriptionStore((s) => s.tier);
    const isLoading = useSubscriptionStore((s) => s.isLoading);
    const hasAccess = useMemo(() => hasFeatureAccess(tier, feature), [tier, feature]);

    return { hasAccess, isLoading, tier };
}
