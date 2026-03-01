/**
 * useNodeUtilsController — React hook wiring for the NodeUtilsBar state machine.
 * Delegates pure state logic to nodeUtilsControllerReducer.
 */
import { useCallback, useReducer, useRef } from 'react';
import { useHoverIntent } from './useHoverIntent';
import {
    nodeUtilsControllerReducer,
    initialNodeUtilsControllerState,
    isPortalBoundaryTarget,
    HOVER_INTENT_DELAY_MS,
} from './nodeUtilsControllerReducer';
import type { NodeUtilsSubmenu } from './nodeUtilsControllerReducer';

export { NODE_UTILS_PORTAL_ATTR, HOVER_INTENT_DELAY_MS, initialNodeUtilsControllerState, nodeUtilsControllerReducer } from './nodeUtilsControllerReducer';
export type { NodeUtilsSubmenu, NodeUtilsMode, NodeUtilsControllerState, NodeUtilsControllerEvent } from './nodeUtilsControllerReducer';

export function useNodeUtilsController(isPinnedOpen = false) {
    const [state, dispatch] = useReducer(nodeUtilsControllerReducer, initialNodeUtilsControllerState);
    const isPinnedRef = useRef(isPinnedOpen);
    isPinnedRef.current = isPinnedOpen;

    const toggleDeckTwoAction = useCallback(() => { dispatch({ type: 'TOGGLE_DECK_TWO' }); }, []);
    const deckTwoHover = useHoverIntent(toggleDeckTwoAction, HOVER_INTENT_DELAY_MS);
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleHoverEnter = useCallback(() => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        deckTwoHover.cancel();
    }, [deckTwoHover]);

    const handleHoverLeave = useCallback((event?: { relatedTarget?: EventTarget | null }) => {
        deckTwoHover.cancel();
        if (isPinnedRef.current) return;
        if (isPortalBoundaryTarget(event?.relatedTarget)) return;
        leaveTimerRef.current = setTimeout(() => {
            dispatch({ type: 'HOVER_LEAVE' });
        }, 300);
    }, [deckTwoHover]);

    const toggleDeckTwo = useCallback(() => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        deckTwoHover.cancel();
        dispatch({ type: 'TOGGLE_DECK_TWO' });
    }, [deckTwoHover]);

    const handleDeckTwoHoverEnter = useCallback(() => { deckTwoHover.onEnter(); }, [deckTwoHover]);
    const handleDeckTwoHoverLeave = useCallback(() => { deckTwoHover.onLeave(); }, [deckTwoHover]);

    const openSubmenu = useCallback((submenu: Exclude<NodeUtilsSubmenu, 'none'>) => {
        dispatch({ type: 'OPEN_SUBMENU', submenu });
    }, []);

    const closeSubmenu = useCallback(() => { dispatch({ type: 'CLOSE_SUBMENU' }); }, []);
    const onEscape = useCallback(() => { dispatch({ type: 'ESCAPE' }); }, []);

    const onOutsidePointer = useCallback(() => {
        if (isPinnedRef.current) return;
        dispatch({ type: 'OUTSIDE_POINTER' });
    }, []);

    const handleProximityLost = useCallback(() => { if (!isPinnedRef.current) dispatch({ type: 'PROXIMITY_LOST' }); }, []);

    return {
        state,
        actions: {
            handleHoverEnter, handleHoverLeave,
            toggleDeckTwo, handleDeckTwoHoverEnter, handleDeckTwoHoverLeave,
            openSubmenu, closeSubmenu, onEscape, onOutsidePointer, handleProximityLost,
        },
    };
}
