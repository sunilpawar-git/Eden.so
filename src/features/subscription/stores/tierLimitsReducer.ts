/**
 * Tier Limits Reducer — Pure state machine for usage limit tracking.
 * Completely isolated from canvas store and Zustand.
 * All state transitions are one-shot; no nested dispatches.
 * Follows tileReducer.ts pattern.
 */
import {
    type TierLimitsState,
    type TierLimitsAction,
    INITIAL_TIER_LIMITS_STATE,
} from '../types/tierLimits';

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

export function tierLimitsReducer(
    state: TierLimitsState,
    action: TierLimitsAction,
): TierLimitsState {
    switch (action.type) {
        case 'USAGE_LOADED':
            return { ...state, ...action.payload, isLoaded: true };

        case 'WORKSPACE_COUNT_CHANGED':
            return { ...state, workspaceCount: action.count };

        case 'NODE_COUNT_CHANGED':
            return { ...state, nodeCount: action.count };

        case 'AI_GENERATED': {
            const today = todayISO();
            const isNewDay = state.aiDailyDate !== today;
            return {
                ...state,
                aiDailyCount: isNewDay ? 1 : state.aiDailyCount + 1,
                aiDailyDate: today,
            };
        }

        case 'AI_DAILY_LOADED':
            return {
                ...state,
                aiDailyCount: action.count,
                aiDailyDate: action.date,
            };

        case 'STORAGE_UPDATED':
            return { ...state, storageMb: action.storageMb };

        case 'RESET':
            return INITIAL_TIER_LIMITS_STATE;

        default:
            return state;
    }
}
