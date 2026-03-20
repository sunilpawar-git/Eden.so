/**
 * useNodeHoverMenuController — React hook wiring for the NodeHoverMenu state machine.
 * Simplified: no deck2 hover-intent, no pin-open state.
 */
import { useCallback, useReducer, useRef } from 'react';
import {
    nodeHoverMenuControllerReducer,
    initialNodeHoverMenuControllerState,
    isPortalBoundaryTarget,
} from './nodeHoverMenuControllerReducer';
import type { NodeHoverMenuSubmenu } from './nodeHoverMenuControllerReducer';

export { NODE_HOVER_MENU_PORTAL_ATTR, initialNodeHoverMenuControllerState, nodeHoverMenuControllerReducer } from './nodeHoverMenuControllerReducer';
export type { NodeHoverMenuSubmenu, NodeHoverMenuMode, NodeHoverMenuControllerState, NodeHoverMenuControllerEvent } from './nodeHoverMenuControllerReducer';

export function useNodeHoverMenuController() {
    const [state, dispatch] = useReducer(nodeHoverMenuControllerReducer, initialNodeHoverMenuControllerState);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleHoverEnter = useCallback(() => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    }, []);

    const handleHoverLeave = useCallback((event?: { relatedTarget?: EventTarget | null }) => {
        if (isPortalBoundaryTarget(event?.relatedTarget)) return;
        leaveTimerRef.current = setTimeout(() => {
            dispatch({ type: 'HOVER_LEAVE' });
        }, 300);
    }, []);

    const openSubmenu = useCallback((submenu: Exclude<NodeHoverMenuSubmenu, 'none'>) => {
        dispatch({ type: 'OPEN_SUBMENU', submenu });
    }, []);

    const closeSubmenu = useCallback(() => { dispatch({ type: 'CLOSE_SUBMENU' }); }, []);
    const onEscape = useCallback(() => { dispatch({ type: 'ESCAPE' }); }, []);

    const onOutsidePointer = useCallback(() => {
        dispatch({ type: 'OUTSIDE_POINTER' });
    }, []);

    const handleProximityLost = useCallback(() => { dispatch({ type: 'PROXIMITY_LOST' }); }, []);

    return {
        state,
        actions: {
            handleHoverEnter, handleHoverLeave,
            openSubmenu, closeSubmenu, onEscape, onOutsidePointer, handleProximityLost,
        },
    };
}
