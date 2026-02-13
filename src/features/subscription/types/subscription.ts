/**
 * Subscription Types - SSOT for tier definitions and feature flags
 * All feature gating logic references these types.
 */

export const SUBSCRIPTION_TIERS = {
    free: 'free',
    pro: 'pro',
} as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS];

/** Features that can be gated behind a subscription */
export const GATED_FEATURES = {
    offlinePin: 'offlinePin',
    backgroundSync: 'backgroundSync',
} as const;

export type GatedFeature = (typeof GATED_FEATURES)[keyof typeof GATED_FEATURES];

/** Maps each feature to the minimum tier required */
export const FEATURE_TIER_MAP: Record<GatedFeature, SubscriptionTier> = {
    [GATED_FEATURES.offlinePin]: SUBSCRIPTION_TIERS.pro,
    [GATED_FEATURES.backgroundSync]: SUBSCRIPTION_TIERS.pro,
};

export interface SubscriptionInfo {
    tier: SubscriptionTier;
    expiresAt: number | null;
    isActive: boolean;
}

/** Tier hierarchy: pro > free */
const TIER_RANK: Record<SubscriptionTier, number> = {
    [SUBSCRIPTION_TIERS.free]: 0,
    [SUBSCRIPTION_TIERS.pro]: 1,
};

/** Check if a tier has access to a specific feature */
export function hasFeatureAccess(tier: SubscriptionTier, feature: GatedFeature): boolean {
    const requiredTier = FEATURE_TIER_MAP[feature];
    return TIER_RANK[tier] >= TIER_RANK[requiredTier];
}
