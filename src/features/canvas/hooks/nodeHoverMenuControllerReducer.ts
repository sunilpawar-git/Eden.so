/**
 * nodeHoverMenuControllerReducer — Pure state machine for NodeHoverMenu interactions.
 * Handles submenu open/close and outside pointer dismissal.
 * Simplified: no deck-two state (secondary actions moved to Right-click Menu).
 */

export const NODE_HOVER_MENU_PORTAL_ATTR = 'data-node-hover-menu-zone';

export type NodeHoverMenuSubmenu = 'none' | 'transform';
export type NodeHoverMenuMode = 'auto' | 'manual';

export interface NodeHoverMenuControllerState {
    mode: NodeHoverMenuMode;
    activeSubmenu: NodeHoverMenuSubmenu;
}

export type NodeHoverMenuControllerEvent =
    | { type: 'HOVER_LEAVE' }
    | { type: 'OPEN_SUBMENU'; submenu: Exclude<NodeHoverMenuSubmenu, 'none'> }
    | { type: 'CLOSE_SUBMENU' }
    | { type: 'ESCAPE' }
    | { type: 'OUTSIDE_POINTER' }
    | { type: 'PROXIMITY_LOST' };

export const initialNodeHoverMenuControllerState: NodeHoverMenuControllerState = {
    mode: 'auto',
    activeSubmenu: 'none',
};

function handleHoverLeave(s: NodeHoverMenuControllerState): NodeHoverMenuControllerState {
    if (s.mode !== 'auto') return s;
    if (s.activeSubmenu === 'none') return s;
    return { ...s, activeSubmenu: 'none' };
}

function handleEscape(s: NodeHoverMenuControllerState): NodeHoverMenuControllerState {
    if (s.activeSubmenu !== 'none') return { ...s, activeSubmenu: 'none' };
    if (s.mode === 'auto') return s;
    return { ...s, activeSubmenu: 'none', mode: 'auto' };
}

function handleProximityLost(s: NodeHoverMenuControllerState): NodeHoverMenuControllerState {
    if (s.activeSubmenu !== 'none') return { ...s, activeSubmenu: 'none', mode: 'auto' };
    if (s.mode === 'auto') return s;
    return { ...s, mode: 'auto' };
}

function handleOutsidePointer(s: NodeHoverMenuControllerState): NodeHoverMenuControllerState {
    if (s.activeSubmenu === 'none' && s.mode === 'auto') return s;
    return { ...s, activeSubmenu: 'none', mode: 'auto' };
}

export function nodeHoverMenuControllerReducer(
    state: NodeHoverMenuControllerState,
    event: NodeHoverMenuControllerEvent,
): NodeHoverMenuControllerState {
    switch (event.type) {
        case 'HOVER_LEAVE':
            return handleHoverLeave(state);
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
    return Boolean(element?.closest(`[${NODE_HOVER_MENU_PORTAL_ATTR}="true"]`));
}
