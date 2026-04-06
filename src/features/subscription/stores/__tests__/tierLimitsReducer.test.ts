/**
 * tierLimitsReducer tests — verifies every action type in the pure state machine.
 * Follows tileReducer.test.ts pattern.
 */
import { describe, it, expect, vi } from 'vitest';
import { tierLimitsReducer } from '../tierLimitsReducer';
import { INITIAL_TIER_LIMITS_STATE, type TierLimitsState } from '../../types/tierLimits';

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

describe('tierLimitsReducer', () => {
    it('returns initial state for unknown action', () => {
        const result = tierLimitsReducer(
            INITIAL_TIER_LIMITS_STATE,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { type: 'UNKNOWN' } as any,
        );
        expect(result).toBe(INITIAL_TIER_LIMITS_STATE);
    });

    describe('USAGE_LOADED', () => {
        it('merges payload and sets isLoaded=true', () => {
            const result = tierLimitsReducer(INITIAL_TIER_LIMITS_STATE, {
                type: 'USAGE_LOADED',
                payload: { workspaceCount: 3, nodeCount: 8, aiDailyCount: 5, aiDailyDate: '2026-04-06' },
            });
            expect(result.workspaceCount).toBe(3);
            expect(result.nodeCount).toBe(8);
            expect(result.aiDailyCount).toBe(5);
            expect(result.aiDailyDate).toBe('2026-04-06');
            expect(result.isLoaded).toBe(true);
        });

        it('preserves fields not in payload', () => {
            const state: TierLimitsState = {
                ...INITIAL_TIER_LIMITS_STATE,
                storageMb: 25,
            };
            const result = tierLimitsReducer(state, {
                type: 'USAGE_LOADED',
                payload: { workspaceCount: 2 },
            });
            expect(result.storageMb).toBe(25);
            expect(result.workspaceCount).toBe(2);
        });
    });

    describe('WORKSPACE_COUNT_CHANGED', () => {
        it('sets workspaceCount', () => {
            const result = tierLimitsReducer(INITIAL_TIER_LIMITS_STATE, {
                type: 'WORKSPACE_COUNT_CHANGED',
                count: 5,
            });
            expect(result.workspaceCount).toBe(5);
        });
    });

    describe('NODE_COUNT_CHANGED', () => {
        it('sets nodeCount', () => {
            const result = tierLimitsReducer(INITIAL_TIER_LIMITS_STATE, {
                type: 'NODE_COUNT_CHANGED',
                count: 12,
            });
            expect(result.nodeCount).toBe(12);
        });
    });

    describe('AI_GENERATED', () => {
        it('increments count for same day', () => {
            const today = todayISO();
            const state: TierLimitsState = {
                ...INITIAL_TIER_LIMITS_STATE,
                aiDailyCount: 10,
                aiDailyDate: today,
            };
            const result = tierLimitsReducer(state, { type: 'AI_GENERATED' });
            expect(result.aiDailyCount).toBe(11);
            expect(result.aiDailyDate).toBe(today);
        });

        it('resets count to 1 on day rollover', () => {
            const yesterday = '2026-04-05';
            const state: TierLimitsState = {
                ...INITIAL_TIER_LIMITS_STATE,
                aiDailyCount: 59,
                aiDailyDate: yesterday,
            };

            // Mock Date so todayISO() returns a future date
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-04-06T10:00:00Z'));

            const result = tierLimitsReducer(state, { type: 'AI_GENERATED' });
            expect(result.aiDailyCount).toBe(1);
            expect(result.aiDailyDate).toBe('2026-04-06');

            vi.useRealTimers();
        });

        it('resets count to 1 when aiDailyDate is empty', () => {
            const result = tierLimitsReducer(INITIAL_TIER_LIMITS_STATE, {
                type: 'AI_GENERATED',
            });
            expect(result.aiDailyCount).toBe(1);
            expect(result.aiDailyDate).toBe(todayISO());
        });
    });

    describe('AI_DAILY_LOADED', () => {
        it('sets count and date from server', () => {
            const result = tierLimitsReducer(INITIAL_TIER_LIMITS_STATE, {
                type: 'AI_DAILY_LOADED',
                count: 42,
                date: '2026-04-06',
            });
            expect(result.aiDailyCount).toBe(42);
            expect(result.aiDailyDate).toBe('2026-04-06');
        });
    });

    describe('STORAGE_UPDATED', () => {
        it('sets storageMb', () => {
            const result = tierLimitsReducer(INITIAL_TIER_LIMITS_STATE, {
                type: 'STORAGE_UPDATED',
                storageMb: 35.5,
            });
            expect(result.storageMb).toBe(35.5);
        });
    });

    describe('RESET', () => {
        it('returns INITIAL_TIER_LIMITS_STATE', () => {
            const state: TierLimitsState = {
                workspaceCount: 5,
                nodeCount: 12,
                aiDailyCount: 60,
                aiDailyDate: '2026-04-06',
                storageMb: 49,
                isLoaded: true,
            };
            const result = tierLimitsReducer(state, { type: 'RESET' });
            expect(result).toEqual(INITIAL_TIER_LIMITS_STATE);
        });
    });

    describe('full lifecycle', () => {
        it('handles load → workspace change → node change → AI gen → reset', () => {
            let state = tierLimitsReducer(INITIAL_TIER_LIMITS_STATE, {
                type: 'USAGE_LOADED',
                payload: { workspaceCount: 2, nodeCount: 5 },
            });
            expect(state.isLoaded).toBe(true);

            state = tierLimitsReducer(state, { type: 'WORKSPACE_COUNT_CHANGED', count: 3 });
            expect(state.workspaceCount).toBe(3);

            state = tierLimitsReducer(state, { type: 'NODE_COUNT_CHANGED', count: 10 });
            expect(state.nodeCount).toBe(10);

            state = tierLimitsReducer(state, { type: 'AI_GENERATED' });
            expect(state.aiDailyCount).toBe(1);

            state = tierLimitsReducer(state, { type: 'RESET' });
            expect(state).toEqual(INITIAL_TIER_LIMITS_STATE);
        });
    });
});
