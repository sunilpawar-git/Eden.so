/**
 * useNodeUtilsController Tests — TDD
 * Reducer invariants + timer-driven hook behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    initialNodeUtilsControllerState,
    nodeUtilsControllerReducer,
    useNodeUtilsController,
} from '../useNodeUtilsController';

describe('nodeUtilsControllerReducer', () => {
    it('opens overflow in auto mode on HOVER_OPEN', () => {
        const next = nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'HOVER_OPEN' });
        expect(next.overflowOpen).toBe(true);
        expect(next.mode).toBe('auto');
    });

    it('closes overflow on HOVER_LEAVE only in auto mode', () => {
        const autoState = { ...initialNodeUtilsControllerState, overflowOpen: true, mode: 'auto' as const };
        const manualState = { ...initialNodeUtilsControllerState, overflowOpen: true, mode: 'manual' as const };
        expect(nodeUtilsControllerReducer(autoState, { type: 'HOVER_LEAVE' }).overflowOpen).toBe(false);
        expect(nodeUtilsControllerReducer(manualState, { type: 'HOVER_LEAVE' }).overflowOpen).toBe(true);
    });

    it('opens overflow + submenu on OPEN_SUBMENU', () => {
        const next = nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'OPEN_SUBMENU', submenu: 'share' });
        expect(next.overflowOpen).toBe(true);
        expect(next.mode).toBe('manual');
        expect(next.activeSubmenu).toBe('share');
    });

    it('closes submenu on CLOSE_SUBMENU', () => {
        const prev = { ...initialNodeUtilsControllerState, overflowOpen: true, activeSubmenu: 'transform' as const };
        const next = nodeUtilsControllerReducer(prev, { type: 'CLOSE_SUBMENU' });
        expect(next.activeSubmenu).toBe('none');
        expect(next.overflowOpen).toBe(true);
    });

    it('ESCAPE closes submenu first, then closes overflow', () => {
        const withSubmenu = { ...initialNodeUtilsControllerState, overflowOpen: true, mode: 'manual' as const, activeSubmenu: 'share' as const };
        const subClosed = nodeUtilsControllerReducer(withSubmenu, { type: 'ESCAPE' });
        expect(subClosed.activeSubmenu).toBe('none');
        expect(subClosed.overflowOpen).toBe(true);
        const overflowClosed = nodeUtilsControllerReducer(subClosed, { type: 'ESCAPE' });
        expect(overflowClosed.overflowOpen).toBe(false);
    });

    it('never keeps submenu open while overflow is closed (invariant)', () => {
        const bad = { ...initialNodeUtilsControllerState, overflowOpen: false, activeSubmenu: 'color' as const };
        const normalized = nodeUtilsControllerReducer(bad, { type: 'CLOSE_SUBMENU' });
        expect(normalized.overflowOpen).toBe(false);
        expect(normalized.activeSubmenu).toBe('none');
    });

    describe('idempotency (returns same reference when nothing changes)', () => {
        it('HOVER_OPEN returns same ref when already open in auto mode', () => {
            const state = { ...initialNodeUtilsControllerState, overflowOpen: true, mode: 'auto' as const };
            expect(nodeUtilsControllerReducer(state, { type: 'HOVER_OPEN' })).toBe(state);
        });

        it('CLOSE_SUBMENU returns same ref when submenu is already none', () => {
            const state = { ...initialNodeUtilsControllerState, overflowOpen: true };
            expect(nodeUtilsControllerReducer(state, { type: 'CLOSE_SUBMENU' })).toBe(state);
        });

        it('OUTSIDE_POINTER returns same ref when already closed', () => {
            expect(nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'OUTSIDE_POINTER' }))
                .toBe(initialNodeUtilsControllerState);
        });

        it('ESCAPE returns same ref when fully closed', () => {
            expect(nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'ESCAPE' }))
                .toBe(initialNodeUtilsControllerState);
        });
    });
});

describe('useNodeUtilsController', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    it('starts with overflow closed', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        expect(result.current.state.overflowOpen).toBe(false);
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('opens overflow after hover delay', () => {
        const { result } = renderHook(() => useNodeUtilsController(false, 300));
        act(() => { result.current.actions.handleHoverEnter(); });
        act(() => { vi.advanceTimersByTime(299); });
        expect(result.current.state.overflowOpen).toBe(false);
        act(() => { vi.advanceTimersByTime(1); });
        expect(result.current.state.overflowOpen).toBe(true);
        expect(result.current.state.mode).toBe('auto');
    });

    it('hover leave cancels pending open timer', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.handleHoverEnter(); });
        act(() => { vi.advanceTimersByTime(200); });
        act(() => { result.current.actions.handleHoverLeave(); });
        act(() => { vi.advanceTimersByTime(600); });
        expect(result.current.state.overflowOpen).toBe(false);
    });

    it('toggle opens in manual mode and closes on second toggle', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.toggleOverflow(); });
        expect(result.current.state.overflowOpen).toBe(true);
        expect(result.current.state.mode).toBe('manual');
        act(() => { result.current.actions.toggleOverflow(); });
        expect(result.current.state.overflowOpen).toBe(false);
    });

    it('hover leave ignores portal-boundary related target', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        const portalRoot = document.createElement('div');
        portalRoot.setAttribute('data-node-utils-zone', 'true');
        const child = document.createElement('button');
        portalRoot.appendChild(child);
        document.body.appendChild(portalRoot);
        act(() => { result.current.actions.toggleOverflow(); });
        act(() => { result.current.actions.handleHoverLeave({ relatedTarget: child }); });
        expect(result.current.state.overflowOpen).toBe(true);
        portalRoot.remove();
    });

    it('isPinnedOpen=true prevents hover leave from closing', () => {
        const { result } = renderHook(() => useNodeUtilsController(true));
        act(() => { result.current.actions.toggleOverflow(); });
        expect(result.current.state.overflowOpen).toBe(true);
        act(() => { result.current.actions.handleHoverLeave(); });
        expect(result.current.state.overflowOpen).toBe(true);
    });

    it('onOutsidePointer closes overflow when not pinned', () => {
        const { result } = renderHook(() => useNodeUtilsController(false));
        act(() => { result.current.actions.toggleOverflow(); });
        expect(result.current.state.overflowOpen).toBe(true);
        act(() => { result.current.actions.onOutsidePointer(); });
        expect(result.current.state.overflowOpen).toBe(false);
    });

    it('onEscape closes overflow even when pinned', () => {
        const { result } = renderHook(() => useNodeUtilsController(true));
        act(() => { result.current.actions.toggleOverflow(); });
        expect(result.current.state.overflowOpen).toBe(true);
        act(() => { result.current.actions.onEscape(); });
        expect(result.current.state.overflowOpen).toBe(false);
    });

    it('onEscape closes submenu first when pinned, then overflow', () => {
        const { result } = renderHook(() => useNodeUtilsController(true));
        act(() => { result.current.actions.toggleOverflow(); });
        act(() => { result.current.actions.openSubmenu('share'); });
        expect(result.current.state.activeSubmenu).toBe('share');

        act(() => { result.current.actions.onEscape(); });
        expect(result.current.state.activeSubmenu).toBe('none');
        expect(result.current.state.overflowOpen).toBe(true);

        act(() => { result.current.actions.onEscape(); });
        expect(result.current.state.overflowOpen).toBe(false);
    });

    it('isPinnedOpen=true prevents onOutsidePointer from closing', () => {
        const { result } = renderHook(() => useNodeUtilsController(true));
        act(() => { result.current.actions.toggleOverflow(); });
        expect(result.current.state.overflowOpen).toBe(true);
        act(() => { result.current.actions.onOutsidePointer(); });
        expect(result.current.state.overflowOpen).toBe(true);
    });
});
