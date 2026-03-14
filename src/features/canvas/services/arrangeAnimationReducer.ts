/**
 * Arrange Animation Reducer — Pure reducer for staggered column-cascade animation.
 *
 * Two-phase state machine: idle → animating → idle.
 * Fully isolated from Zustand: zero store imports.
 * Used with React.useReducer in useArrangeAnimation hook.
 */

/** Stagger delay per column in milliseconds */
export const STAGGER_DELAY_PER_COLUMN_MS = 60;

/** Duration of the node transform transition in milliseconds */
export const ANIMATION_DURATION_MS = 400;

export interface ArrangeAnimState {
    phase: 'idle' | 'animating';
    /** Map of nodeId → transition-delay in ms (based on column index) */
    columnDelays: ReadonlyMap<string, number>;
}

export type ArrangeAnimAction =
    | { type: 'START_ANIMATE'; columnAssignments: ReadonlyMap<string, number> }
    | { type: 'RESET' };

export const INITIAL_ARRANGE_ANIM_STATE: ArrangeAnimState = {
    phase: 'idle',
    columnDelays: new Map(),
};

/**
 * Computes per-node transition-delay from column assignments.
 * Column 0 → 0ms, column 1 → 60ms, column 2 → 120ms, etc.
 */
function computeDelays(
    columnAssignments: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
    const delays = new Map<string, number>();
    for (const [nodeId, colIdx] of columnAssignments) {
        delays.set(nodeId, colIdx * STAGGER_DELAY_PER_COLUMN_MS);
    }
    return delays;
}

/**
 * Computes the total animation wait time (max delay + animation duration).
 * Used to schedule the RESET action.
 */
export function computeTotalAnimationMs(
    columnAssignments: ReadonlyMap<string, number>,
): number {
    let maxCol = 0;
    for (const col of columnAssignments.values()) {
        if (col > maxCol) maxCol = col;
    }
    return maxCol * STAGGER_DELAY_PER_COLUMN_MS + ANIMATION_DURATION_MS;
}

export function arrangeAnimationReducer(
    state: ArrangeAnimState,
    action: ArrangeAnimAction,
): ArrangeAnimState {
    switch (action.type) {
        case 'START_ANIMATE':
            return {
                phase: 'animating',
                columnDelays: computeDelays(action.columnAssignments),
            };
        case 'RESET':
            return INITIAL_ARRANGE_ANIM_STATE;
        default:
            return state;
    }
}
