/**
 * nodeUtilsControllerReducer — Pure state machine for NodeUtilsBar interactions.
 * Handles submenu, deck-two, and pin state transitions.
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

export function nodeUtilsControllerReducer(
    state: NodeUtilsControllerState,
    event: NodeUtilsControllerEvent
): NodeUtilsControllerState {
    switch (event.type) {
        case 'HOVER_LEAVE':
            if (state.mode !== 'auto') return state;
            if (!state.isDeckTwoOpen && state.activeSubmenu === 'none') return state;
            return { ...state, isDeckTwoOpen: false, activeSubmenu: 'none' };
        case 'TOGGLE_DECK_TWO':
            return {
                ...state,
                isDeckTwoOpen: !state.isDeckTwoOpen,
                mode: !state.isDeckTwoOpen ? 'manual' : 'auto'
            };
        case 'OPEN_SUBMENU':
            return { ...state, mode: 'manual', activeSubmenu: event.submenu };
        case 'CLOSE_SUBMENU':
            if (state.activeSubmenu === 'none') return state;
            return { ...state, activeSubmenu: 'none' };
        case 'ESCAPE':
            if (state.activeSubmenu !== 'none') {
                return { ...state, activeSubmenu: 'none' };
            }
            if (state.isDeckTwoOpen) {
                return { ...state, isDeckTwoOpen: false };
            }
            if (state.mode === 'auto') return state;
            return { ...state, isDeckTwoOpen: false, activeSubmenu: 'none', mode: 'auto' };
        case 'PROXIMITY_LOST':
            // Don't close an active submenu portal — user may be moving to interact with it.
            // OUTSIDE_POINTER (click elsewhere) handles that dismissal path.
            if (state.activeSubmenu !== 'none') return state;
            if (!state.isDeckTwoOpen && state.mode === 'auto') return state;
            return { ...state, isDeckTwoOpen: false, mode: 'auto' };
        case 'OUTSIDE_POINTER':
            if (!state.isDeckTwoOpen && state.activeSubmenu === 'none' && state.mode === 'auto') return state;
            return { ...state, isDeckTwoOpen: false, activeSubmenu: 'none', mode: 'auto' };
        default:
            return state;
    }
}

export function isPortalBoundaryTarget(target: EventTarget | null | undefined): boolean {
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest(`[${NODE_UTILS_PORTAL_ATTR}="true"]`));
}
