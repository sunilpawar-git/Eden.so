/**
 * useNodeUtilsController — Single-owner interaction controller for NodeUtilsBar.
 * Reducer-driven state machine for overflow/submenu/pin interactions.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';

export const NODE_UTILS_PORTAL_ATTR = 'data-node-utils-zone';

export type NodeUtilsSubmenu = 'none' | 'share' | 'transform' | 'color';
export type NodeUtilsMode = 'auto' | 'manual';

export interface NodeUtilsControllerState {
    overflowOpen: boolean;
    mode: NodeUtilsMode;
    activeSubmenu: NodeUtilsSubmenu;
}

export type NodeUtilsControllerEvent =
    | { type: 'HOVER_OPEN' }
    | { type: 'HOVER_LEAVE' }
    | { type: 'TOGGLE_OVERFLOW' }
    | { type: 'OPEN_SUBMENU'; submenu: Exclude<NodeUtilsSubmenu, 'none'> }
    | { type: 'CLOSE_SUBMENU' }
    | { type: 'ESCAPE' }
    | { type: 'OUTSIDE_POINTER' };

export const initialNodeUtilsControllerState: NodeUtilsControllerState = {
    overflowOpen: false,
    mode: 'auto',
    activeSubmenu: 'none',
};

function enforceInvariants(state: NodeUtilsControllerState): NodeUtilsControllerState {
    if (!state.overflowOpen && state.activeSubmenu !== 'none') {
        return { ...state, activeSubmenu: 'none' };
    }
    return state;
}

export function nodeUtilsControllerReducer(
    state: NodeUtilsControllerState,
    event: NodeUtilsControllerEvent
): NodeUtilsControllerState {
    let next = state;
    switch (event.type) {
        case 'HOVER_OPEN':
            if (state.overflowOpen && state.mode === 'auto') return state;
            next = { ...state, overflowOpen: true, mode: 'auto' };
            break;
        case 'HOVER_LEAVE':
            if (state.mode !== 'auto') return state;
            if (!state.overflowOpen && state.activeSubmenu === 'none') return state;
            next = { ...state, overflowOpen: false, activeSubmenu: 'none' };
            break;
        case 'TOGGLE_OVERFLOW':
            next = state.overflowOpen
                ? { ...state, overflowOpen: false, activeSubmenu: 'none', mode: 'auto' }
                : { ...state, overflowOpen: true, mode: 'manual' };
            break;
        case 'OPEN_SUBMENU':
            next = { ...state, overflowOpen: true, mode: 'manual', activeSubmenu: event.submenu };
            break;
        case 'CLOSE_SUBMENU':
            if (state.activeSubmenu === 'none') return state;
            next = { ...state, activeSubmenu: 'none' };
            break;
        case 'ESCAPE':
            if (state.activeSubmenu !== 'none') {
                next = { ...state, activeSubmenu: 'none' };
                break;
            }
            if (!state.overflowOpen && state.mode === 'auto') return state;
            next = { ...state, overflowOpen: false, activeSubmenu: 'none', mode: 'auto' };
            break;
        case 'OUTSIDE_POINTER':
            if (!state.overflowOpen && state.activeSubmenu === 'none' && state.mode === 'auto') return state;
            next = { ...state, overflowOpen: false, activeSubmenu: 'none', mode: 'auto' };
            break;
        default:
            return state;
    }
    return enforceInvariants(next);
}

interface HoverLeaveLike {
    relatedTarget?: EventTarget | null;
}

function isPortalBoundaryTarget(target: EventTarget | null | undefined): boolean {
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest(`[${NODE_UTILS_PORTAL_ATTR}="true"]`));
}

export function useNodeUtilsController(isPinnedOpen = false, openDelayMs = 600) {
    const [state, dispatch] = useReducer(nodeUtilsControllerReducer, initialNodeUtilsControllerState);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isPinnedRef = useRef(isPinnedOpen);
    isPinnedRef.current = isPinnedOpen;

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleHoverEnter = useCallback(() => {
        clearTimer();
        timerRef.current = setTimeout(() => {
            dispatch({ type: 'HOVER_OPEN' });
        }, openDelayMs);
    }, [clearTimer, openDelayMs]);

    const handleHoverLeave = useCallback((event?: HoverLeaveLike) => {
        clearTimer();
        if (isPinnedRef.current) return;
        if (isPortalBoundaryTarget(event?.relatedTarget)) return;
        dispatch({ type: 'HOVER_LEAVE' });
    }, [clearTimer]);

    const toggleOverflow = useCallback(() => {
        clearTimer();
        dispatch({ type: 'TOGGLE_OVERFLOW' });
    }, [clearTimer]);

    const openSubmenu = useCallback((submenu: Exclude<NodeUtilsSubmenu, 'none'>) => {
        dispatch({ type: 'OPEN_SUBMENU', submenu });
    }, []);

    const closeSubmenu = useCallback(() => {
        dispatch({ type: 'CLOSE_SUBMENU' });
    }, []);

    const onEscape = useCallback(() => {
        if (isPinnedRef.current) return;
        dispatch({ type: 'ESCAPE' });
    }, []);

    const onOutsidePointer = useCallback(() => {
        if (isPinnedRef.current) return;
        dispatch({ type: 'OUTSIDE_POINTER' });
    }, []);

    useEffect(() => () => clearTimer(), [clearTimer]);

    return {
        state,
        actions: {
            handleHoverEnter,
            handleHoverLeave,
            toggleOverflow,
            openSubmenu,
            closeSubmenu,
            onEscape,
            onOutsidePointer,
        },
    };
}
