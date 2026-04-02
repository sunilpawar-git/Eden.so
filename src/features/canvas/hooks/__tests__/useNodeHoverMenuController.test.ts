/**
 * useNodeHoverMenuController Tests — Simplified state machine.
 * No deck2, no hover-intent, no pin-open. Only transform submenu.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    initialNodeHoverMenuControllerState,
    nodeHoverMenuControllerReducer,
    useNodeHoverMenuController,
} from '../useNodeHoverMenuController';

describe('nodeHoverMenuControllerReducer (simplified)', () => {
    it('OPEN_SUBMENU sets activeSubmenu', () => {
        const next = nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, {
            type: 'OPEN_SUBMENU', submenu: 'transform',
        });
        expect(next.activeSubmenu).toBe('transform');
        expect(next.mode).toBe('manual');
    });

    it('CLOSE_SUBMENU clears activeSubmenu', () => {
        const prev = { ...initialNodeHoverMenuControllerState, activeSubmenu: 'transform' as const, mode: 'manual' as const };
        const next = nodeHoverMenuControllerReducer(prev, { type: 'CLOSE_SUBMENU' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('CLOSE_SUBMENU returns same ref when already none', () => {
        expect(nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, { type: 'CLOSE_SUBMENU' }))
            .toBe(initialNodeHoverMenuControllerState);
    });

    it('ESCAPE closes submenu', () => {
        const open = { ...initialNodeHoverMenuControllerState, activeSubmenu: 'transform' as const, mode: 'manual' as const };
        const next = nodeHoverMenuControllerReducer(open, { type: 'ESCAPE' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('ESCAPE from idle is no-op', () => {
        expect(nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, { type: 'ESCAPE' }))
            .toBe(initialNodeHoverMenuControllerState);
    });

    it('HOVER_LEAVE in auto mode closes submenu', () => {
        const state = { ...initialNodeHoverMenuControllerState, activeSubmenu: 'transform' as const };
        const next = nodeHoverMenuControllerReducer(state, { type: 'HOVER_LEAVE' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('HOVER_LEAVE in manual mode is no-op', () => {
        const state = { ...initialNodeHoverMenuControllerState, mode: 'manual' as const, activeSubmenu: 'transform' as const };
        const next = nodeHoverMenuControllerReducer(state, { type: 'HOVER_LEAVE' });
        expect(next).toBe(state);
    });

    it('OUTSIDE_POINTER closes everything and resets to auto', () => {
        const state = { ...initialNodeHoverMenuControllerState, activeSubmenu: 'transform' as const, mode: 'manual' as const };
        const next = nodeHoverMenuControllerReducer(state, { type: 'OUTSIDE_POINTER' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    it('OUTSIDE_POINTER from idle auto is no-op', () => {
        expect(nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, { type: 'OUTSIDE_POINTER' }))
            .toBe(initialNodeHoverMenuControllerState);
    });

    it('PROXIMITY_LOST with active submenu closes submenu and resets to auto', () => {
        const state = { ...initialNodeHoverMenuControllerState, activeSubmenu: 'transform' as const, mode: 'manual' as const };
        const next = nodeHoverMenuControllerReducer(state, { type: 'PROXIMITY_LOST' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    it('PROXIMITY_LOST in manual mode returns to auto', () => {
        const state = { ...initialNodeHoverMenuControllerState, mode: 'manual' as const };
        const next = nodeHoverMenuControllerReducer(state, { type: 'PROXIMITY_LOST' });
        expect(next.mode).toBe('auto');
    });

    it('PROXIMITY_LOST from idle auto is no-op', () => {
        expect(nodeHoverMenuControllerReducer(initialNodeHoverMenuControllerState, { type: 'PROXIMITY_LOST' }))
            .toBe(initialNodeHoverMenuControllerState);
    });
});

describe('useNodeHoverMenuController', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    it('starts with submenu none', () => {
        const { result } = renderHook(() => useNodeHoverMenuController());
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('openSubmenu sets activeSubmenu', () => {
        const { result } = renderHook(() => useNodeHoverMenuController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        expect(result.current.state.activeSubmenu).toBe('transform');
    });

    it('closeSubmenu clears activeSubmenu', () => {
        const { result } = renderHook(() => useNodeHoverMenuController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.closeSubmenu(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('hover leave dispatches HOVER_LEAVE after 300ms', () => {
        const { result } = renderHook(() => useNodeHoverMenuController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.handleHoverLeave(); });
        expect(result.current.state.activeSubmenu).toBe('transform');
        act(() => { vi.advanceTimersByTime(300); });
    });

    it('hover leave ignores portal-boundary related target', () => {
        const { result } = renderHook(() => useNodeHoverMenuController());
        const portalRoot = document.createElement('div');
        portalRoot.setAttribute('data-node-hover-menu-zone', 'true');
        const child = document.createElement('button');
        portalRoot.appendChild(child);
        document.body.appendChild(portalRoot);
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.handleHoverLeave({ relatedTarget: child }); });
        expect(result.current.state.activeSubmenu).toBe('transform');
        portalRoot.remove();
    });

    it('onOutsidePointer closes everything', () => {
        const { result } = renderHook(() => useNodeHoverMenuController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.onOutsidePointer(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('onEscape closes submenu', () => {
        const { result } = renderHook(() => useNodeHoverMenuController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.onEscape(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('handleProximityLost closes active submenu and resets to auto', () => {
        const { result } = renderHook(() => useNodeHoverMenuController());
        act(() => { result.current.actions.openSubmenu('transform'); });
        act(() => { result.current.actions.handleProximityLost(); });
        expect(result.current.state.activeSubmenu).toBe('none');
        expect(result.current.state.mode).toBe('auto');
    });
});
