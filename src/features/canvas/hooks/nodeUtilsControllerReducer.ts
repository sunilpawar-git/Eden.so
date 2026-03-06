/**
 * nodeUtilsControllerReducer — Pure state machine for NodeUtilsBar interactions.
 * Handles submenu, deck-two, and pin state transitions.
 * Complex case handlers extracted as pure functions to keep complexity low.
 */

export const NODE_UTILS_PORTAL_ATTR = 'data-node-utils-zone';

/** Shared delay for hover-intent open on chevron button (ms). */
export const HOVER_INTENT_DELAY_MS = 1200;

export type NodeUtilsSubmenu = 'none' | 'share' | 'transform' | 'color';
export type NodeUtilsMode = 'auto' | 'manual';

export interface NodeUtilsControllerState {
    isDeckTwoOpen: boolean;
    mode: NodeUtilsMode;
    activeSubmenu: NodeUtilsSubmenu;
}

export type NodeUtilsControllerEvent =
    | { type: 'HOVER_LEAVE' }
    | { type: 'TOGGLE_DECK_TWO' }
    | { type: 'OPEN_SUBMENU'; submenu: Exclude<NodeUtilsSubmenu, 'none'> }
    | { type: 'CLOSE_SUBMENU' }
    | { type: 'ESCAPE' }
    | { type: 'OUTSIDE_POINTER' }
    | { type: 'PROXIMITY_LOST' };

export const initialNodeUtilsControllerState: NodeUtilsControllerState = {
    isDeckTwoOpen: false,
    mode: 'auto',
    activeSubmenu: 'none',
};

// ---------------------------------------------------------------------------
// Case handler helpers (extracted to reduce reducer cyclomatic complexity)
// ---------------------------------------------------------------------------

function handleHoverLeave(s: NodeUtilsControllerState): NodeUtilsControllerState {
    if (s.mode !== 'auto') return s;
    if (!s.isDeckTwoOpen && s.activeSubmenu === 'none') return s;
    return { ...s, isDeckTwoOpen: false, activeSubmenu: 'none' };
}

function handleEscape(s: NodeUtilsControllerState): NodeUtilsControllerState {
    if (s.activeSubmenu !== 'none') return { ...s, activeSubmenu: 'none' };
    if (s.isDeckTwoOpen) return { ...s, isDeckTwoOpen: false };
    if (s.mode === 'auto') return s;
    return { ...s, isDeckTwoOpen: false, activeSubmenu: 'none', mode: 'auto' };
}

function handleProximityLost(s: NodeUtilsControllerState): NodeUtilsControllerState {
    // Don't close an active submenu portal — user may be moving to interact with it.
    // OUTSIDE_POINTER (click elsewhere) handles that dismissal path.
    if (s.activeSubmenu !== 'none') return s;
    if (!s.isDeckTwoOpen && s.mode === 'auto') return s;
    return { ...s, isDeckTwoOpen: false, mode: 'auto' };
}

function handleOutsidePointer(s: NodeUtilsControllerState): NodeUtilsControllerState {
    if (!s.isDeckTwoOpen && s.activeSubmenu === 'none' && s.mode === 'auto') return s;
    return { ...s, isDeckTwoOpen: false, activeSubmenu: 'none', mode: 'auto' };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function nodeUtilsControllerReducer(
    state: NodeUtilsControllerState,
    event: NodeUtilsControllerEvent
): NodeUtilsControllerState {
    switch (event.type) {
        case 'HOVER_LEAVE':
            return handleHoverLeave(state);
        case 'TOGGLE_DECK_TWO':
            return {
                ...state,
                isDeckTwoOpen: !state.isDeckTwoOpen,
                mode: !state.isDeckTwoOpen ? 'manual' : 'auto',
            };
        case 'OPEN_SUBMENU':
            return { ...state, mode: 'manual', activeSubmenu: event.submenu };
        case 'CLOSE_SUBMENU':
            if (state.activeSubmenu === 'none') return state;
            return { ...state, activeSubmenu: 'none' };
        case 'ESCAPE':
            return handleEscape(state);
        case 'PROXIMITY_LOST':
            return handleProximityLost(state);
        case 'OUTSIDE_POINTER':
            return handleOutsidePointer(state);
        default:
            return state;
    }
}

export function isPortalBoundaryTarget(target: EventTarget | null | undefined): boolean {
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest(`[${NODE_UTILS_PORTAL_ATTR}="true"]`));
}
