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

export { NODE_UTILS_PORTAL_ATTR } from './nodeUtilsControllerReducer';
export type { NodeUtilsSubmenu, NodeUtilsMode, NodeUtilsControllerState, NodeUtilsControllerEvent } from './nodeUtilsControllerReducer';
export { HOVER_INTENT_DELAY_MS, initialNodeUtilsControllerState, nodeUtilsControllerReducer } from './nodeUtilsControllerReducer';

interface HoverLeaveLike {
    relatedTarget?: EventTarget | null;
}

export function useNodeUtilsController(isPinnedOpen = false) {
    const [state, dispatch] = useReducer(nodeUtilsControllerReducer, initialNodeUtilsControllerState);
    const isPinnedRef = useRef(isPinnedOpen);
    isPinnedRef.current = isPinnedOpen;

    const toggleDeckTwoAction = useCallback(() => { dispatch({ type: 'TOGGLE_DECK_TWO' }); }, []);
    const deckTwoHover = useHoverIntent(toggleDeckTwoAction, HOVER_INTENT_DELAY_MS);

    const handleHoverEnter = useCallback(() => {
        deckTwoHover.cancel();
    }, [deckTwoHover]);

    const handleHoverLeave = useCallback((event?: HoverLeaveLike) => {
        deckTwoHover.cancel();
        if (isPinnedRef.current) return;
        if (isPortalBoundaryTarget(event?.relatedTarget)) return;
        dispatch({ type: 'HOVER_LEAVE' });
    }, [deckTwoHover]);

    const toggleDeckTwo = useCallback(() => {
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

    return {
        state,
        actions: {
            handleHoverEnter, handleHoverLeave,
            toggleDeckTwo, handleDeckTwoHoverEnter, handleDeckTwoHoverLeave,
            openSubmenu, closeSubmenu, onEscape, onOutsidePointer,
        },
    };
}
