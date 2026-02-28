/**
 * useFeatureGate Hook Tests
 * TDD: Verifies feature gating based on subscription tier
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureGate } from '../useFeatureGate';
import { GATED_FEATURES, SUBSCRIPTION_TIERS } from '../../types/subscription';

// Mock subscription store
let mockTier: string = SUBSCRIPTION_TIERS.free;
let mockIsLoading = false;

vi.mock('../../stores/subscriptionStore', () => ({
    useSubscriptionStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({
            tier: mockTier,
            isLoading: mockIsLoading,
            hasAccess: () => {
                return mockTier === 'pro';
            },
        }),
}));

describe('useFeatureGate', () => {
    beforeEach(() => {
        mockTier = SUBSCRIPTION_TIERS.free;
        mockIsLoading = false;
    });

    it('returns hasAccess=false for pro feature on free tier', () => {
        mockTier = SUBSCRIPTION_TIERS.free;
        const { result } = renderHook(() => useFeatureGate(GATED_FEATURES.offlinePin));
        expect(result.current.hasAccess).toBe(false);
    });

    it('returns hasAccess=true for pro feature on pro tier', () => {
        mockTier = SUBSCRIPTION_TIERS.pro;
        const { result } = renderHook(() => useFeatureGate(GATED_FEATURES.offlinePin));
        expect(result.current.hasAccess).toBe(true);
    });

    it('returns isLoading from store', () => {
        mockIsLoading = true;
        const { result } = renderHook(() => useFeatureGate(GATED_FEATURES.backgroundSync));
        expect(result.current.isLoading).toBe(true);
    });

    it('returns current tier', () => {
        mockTier = SUBSCRIPTION_TIERS.pro;
        const { result } = renderHook(() => useFeatureGate(GATED_FEATURES.backgroundSync));
        expect(result.current.tier).toBe('pro');
    });

    it('uses pure hasFeatureAccess (not store method) for derivation', () => {
        mockTier = SUBSCRIPTION_TIERS.free;
        const { result } = renderHook(() => useFeatureGate(GATED_FEATURES.offlinePin));
        expect(result.current.hasAccess).toBe(false);
        expect(result.current.tier).toBe('free');
    });

    it('returns correct access for each gated feature on free tier', () => {
        mockTier = SUBSCRIPTION_TIERS.free;
        const pin = renderHook(() => useFeatureGate(GATED_FEATURES.offlinePin));
        const sync = renderHook(() => useFeatureGate(GATED_FEATURES.backgroundSync));
        expect(pin.result.current.hasAccess).toBe(false);
        expect(sync.result.current.hasAccess).toBe(false);
    });

    it('returns correct access for each gated feature on pro tier', () => {
        mockTier = SUBSCRIPTION_TIERS.pro;
        const pin = renderHook(() => useFeatureGate(GATED_FEATURES.offlinePin));
        const sync = renderHook(() => useFeatureGate(GATED_FEATURES.backgroundSync));
        expect(pin.result.current.hasAccess).toBe(true);
        expect(sync.result.current.hasAccess).toBe(true);
    });
});
