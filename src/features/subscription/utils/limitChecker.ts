/**
 * Limit Checker — Pure function to check if a usage limit is exceeded.
 * No side effects, no store dependencies. Fully unit-testable.
 */
import {
    type TierLimitsState,
    type LimitCheckResult,
    type LimitKind,
    getLimitsForTier,
} from '../types/tierLimits';
import type { SubscriptionTier } from '../types/subscription';

/**
 * Check whether the user is within the limit for a given resource kind.
 * Returns a result with allowed/current/max for UI display.
 */
export function checkLimit(
    kind: LimitKind,
    state: TierLimitsState,
    tier: SubscriptionTier,
): LimitCheckResult {
    const limits = getLimitsForTier(tier);

    switch (kind) {
        case 'workspace':
            return {
                allowed: state.workspaceCount < limits.maxWorkspaces,
                current: state.workspaceCount,
                max: limits.maxWorkspaces,
                kind,
            };
        case 'node':
            return {
                allowed: state.nodeCount < limits.maxNodesPerWorkspace,
                current: state.nodeCount,
                max: limits.maxNodesPerWorkspace,
                kind,
            };
        case 'aiDaily':
            return {
                allowed: state.aiDailyCount < limits.maxAiGenerationsPerDay,
                current: state.aiDailyCount,
                max: limits.maxAiGenerationsPerDay,
                kind,
            };
        case 'storage':
            return {
                allowed: state.storageMb < limits.maxStorageMb,
                current: state.storageMb,
                max: limits.maxStorageMb,
                kind,
            };
    }
}
