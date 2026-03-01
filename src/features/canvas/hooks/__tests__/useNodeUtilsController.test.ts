/**
 * useNodeUtilsController Tests — TDD
 * Reducer invariants + timer-driven hook behavior.
 * Submenus are independent — no overflow coupling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    initialNodeUtilsControllerState,
    nodeUtilsControllerReducer,
    useNodeUtilsController,
    HOVER_INTENT_DELAY_MS,
} from '../useNodeUtilsController';

describe('nodeUtilsControllerReducer', () => {
    it('OPEN_SUBMENU sets activeSubmenu without any overflow side-effect', () => {
        const next = nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'OPEN_SUBMENU', submenu: 'color' });
        expect(next.activeSubmenu).toBe('color');
        expect(next).not.toHaveProperty('overflowOpen');
    });

    it('CLOSE_SUBMENU clears activeSubmenu independently', () => {
        const prev = { ...initialNodeUtilsControllerState, activeSubmenu: 'transform' as const };
        const next = nodeUtilsControllerReducer(prev, { type: 'CLOSE_SUBMENU' });
        expect(next.activeSubmenu).toBe('none');
    });

    it('TOGGLE_DECK_TWO toggles isDeckTwoOpen', () => {
        const next = nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'TOGGLE_DECK_TWO' });
        expect(next.isDeckTwoOpen).toBe(true);
        const toggled = nodeUtilsControllerReducer(next, { type: 'TOGGLE_DECK_TWO' });
        expect(toggled.isDeckTwoOpen).toBe(false);
    });

    it('ESCAPE closes submenu first, then deck two', () => {
        const withSubmenu = { ...initialNodeUtilsControllerState, isDeckTwoOpen: true, activeSubmenu: 'share' as const };
        const subClosed = nodeUtilsControllerReducer(withSubmenu, { type: 'ESCAPE' });
        expect(subClosed.activeSubmenu).toBe('none');
        expect(subClosed.isDeckTwoOpen).toBe(true);
        const deckClosed = nodeUtilsControllerReducer(subClosed, { type: 'ESCAPE' });
        expect(deckClosed.isDeckTwoOpen).toBe(false);
    });

    it('HOVER_LEAVE in auto mode closes submenu and deck two', () => {
        const state = { ...initialNodeUtilsControllerState, isDeckTwoOpen: true, activeSubmenu: 'color' as const, mode: 'auto' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'HOVER_LEAVE' });
        expect(next.isDeckTwoOpen).toBe(false);
        expect(next.activeSubmenu).toBe('none');
    });

    it('HOVER_LEAVE does NOT close in manual mode', () => {
        const state = { ...initialNodeUtilsControllerState, isDeckTwoOpen: true, mode: 'manual' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'HOVER_LEAVE' });
        expect(next).toBe(state);
    });

    it('OUTSIDE_POINTER closes everything and resets to auto', () => {
        const state = { ...initialNodeUtilsControllerState, isDeckTwoOpen: true, activeSubmenu: 'share' as const, mode: 'manual' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'OUTSIDE_POINTER' });
        expect(next.isDeckTwoOpen).toBe(false);
        expect(next.activeSubmenu).toBe('none');
        expect(next.mode).toBe('auto');
    });

    describe('idempotency (returns same reference when nothing changes)', () => {
        it('CLOSE_SUBMENU returns same ref when submenu is already none', () => {
            expect(nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'CLOSE_SUBMENU' }))
                .toBe(initialNodeUtilsControllerState);
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

    it('starts with submenu none and deck two closed', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        expect(result.current.state.activeSubmenu).toBe('none');
        expect(result.current.state.isDeckTwoOpen).toBe(false);
    });

    it('openSubmenu sets activeSubmenu to the given submenu', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('share'); });
        expect(result.current.state.activeSubmenu).toBe('share');
    });

    it('closeSubmenu clears activeSubmenu', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.openSubmenu('color'); });
        act(() => { result.current.actions.closeSubmenu(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('hover leave ignores portal-boundary related target', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        const portalRoot = document.createElement('div');
        portalRoot.setAttribute('data-node-utils-zone', 'true');
        const child = document.createElement('button');
        portalRoot.appendChild(child);
        document.body.appendChild(portalRoot);
        act(() => { result.current.actions.openSubmenu('share'); });
        act(() => { result.current.actions.handleHoverLeave({ relatedTarget: child }); });
        expect(result.current.state.activeSubmenu).toBe('share');
        portalRoot.remove();
    });

    it('isPinnedOpen=true prevents hover leave from closing', () => {
        const { result } = renderHook(() => useNodeUtilsController(true));
        act(() => { result.current.actions.toggleDeckTwo(); });
        expect(result.current.state.isDeckTwoOpen).toBe(true);
        act(() => { result.current.actions.handleHoverLeave(); });
        expect(result.current.state.isDeckTwoOpen).toBe(true);
    });

    it('onOutsidePointer closes when not pinned', () => {
        const { result } = renderHook(() => useNodeUtilsController(false));
        act(() => { result.current.actions.openSubmenu('share'); });
        act(() => { result.current.actions.onOutsidePointer(); });
        expect(result.current.state.activeSubmenu).toBe('none');
    });

    it('isPinnedOpen=true prevents onOutsidePointer from closing', () => {
        const { result } = renderHook(() => useNodeUtilsController(true));
        act(() => { result.current.actions.openSubmenu('share'); });
        act(() => { result.current.actions.onOutsidePointer(); });
        expect(result.current.state.activeSubmenu).toBe('share');
    });

    it('onEscape closes submenu first, then deck two', () => {
        const { result } = renderHook(() => useNodeUtilsController());
        act(() => { result.current.actions.toggleDeckTwo(); });
        act(() => { result.current.actions.openSubmenu('share'); });
        expect(result.current.state.activeSubmenu).toBe('share');

        act(() => { result.current.actions.onEscape(); });
        expect(result.current.state.activeSubmenu).toBe('none');
        expect(result.current.state.isDeckTwoOpen).toBe(true);

        act(() => { result.current.actions.onEscape(); });
        expect(result.current.state.isDeckTwoOpen).toBe(false);
    });

    describe('deck two toggle', () => {
        it('initial isDeckTwoOpen is false', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            expect(result.current.state.isDeckTwoOpen).toBe(false);
        });

        it('toggleDeckTwo opens deck two', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.toggleDeckTwo(); });
            expect(result.current.state.isDeckTwoOpen).toBe(true);
        });

        it('toggleDeckTwo closes when already open', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.toggleDeckTwo(); });
            act(() => { result.current.actions.toggleDeckTwo(); });
            expect(result.current.state.isDeckTwoOpen).toBe(false);
        });

        it('HOVER_LEAVE (manual mode) does NOT close deck two', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.toggleDeckTwo(); });
            expect(result.current.state.isDeckTwoOpen).toBe(true);
            act(() => { result.current.actions.handleHoverLeave(); });
            act(() => { vi.advanceTimersByTime(300); });
            expect(result.current.state.isDeckTwoOpen).toBe(true);
        });

        it('ESCAPE closes deck two', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.toggleDeckTwo(); });
            act(() => { result.current.actions.onEscape(); });
            expect(result.current.state.isDeckTwoOpen).toBe(false);
        });

        it('OUTSIDE_POINTER closes deck two', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.toggleDeckTwo(); });
            act(() => { result.current.actions.onOutsidePointer(); });
            expect(result.current.state.isDeckTwoOpen).toBe(false);
        });

        it('isPinnedOpen prevents HOVER_LEAVE from closing deck two', () => {
            const { result } = renderHook(() => useNodeUtilsController(true));
            act(() => { result.current.actions.toggleDeckTwo(); });
            act(() => { result.current.actions.handleHoverLeave(); });
            expect(result.current.state.isDeckTwoOpen).toBe(true);
        });

        it('handleDeckTwoHoverEnter opens after HOVER_INTENT_DELAY_MS', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.handleDeckTwoHoverEnter(); });
            act(() => { vi.advanceTimersByTime(HOVER_INTENT_DELAY_MS - 1); });
            expect(result.current.state.isDeckTwoOpen).toBe(false);
            act(() => { vi.advanceTimersByTime(1); });
            expect(result.current.state.isDeckTwoOpen).toBe(true);
        });

        it('handleDeckTwoHoverLeave cancels pending open', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.handleDeckTwoHoverEnter(); });
            act(() => { vi.advanceTimersByTime(500); });
            act(() => { result.current.actions.handleDeckTwoHoverLeave(); });
            act(() => { vi.advanceTimersByTime(HOVER_INTENT_DELAY_MS); });
            expect(result.current.state.isDeckTwoOpen).toBe(false);
        });

        it('handleProximityLost closes deck two in manual mode immediately', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.toggleDeckTwo(); });
            expect(result.current.state.isDeckTwoOpen).toBe(true);
            expect(result.current.state.mode).toBe('manual');
            act(() => { result.current.actions.handleProximityLost(); });
            expect(result.current.state.isDeckTwoOpen).toBe(false);
            expect(result.current.state.mode).toBe('auto');
        });

        it('handleProximityLost does NOT close active submenu portal (color picker stays accessible)', () => {
            const { result } = renderHook(() => useNodeUtilsController());
            act(() => { result.current.actions.openSubmenu('color'); });
            expect(result.current.state.activeSubmenu).toBe('color');
            act(() => { result.current.actions.handleProximityLost(); });
            // Portal lives in document.body — state must stay unchanged so user can click a color
            expect(result.current.state.activeSubmenu).toBe('color');
            expect(result.current.state.mode).toBe('manual');
        });

        it('handleProximityLost is a no-op when isPinnedOpen=true', () => {
            const { result } = renderHook(() => useNodeUtilsController(true));
            act(() => { result.current.actions.toggleDeckTwo(); });
            expect(result.current.state.isDeckTwoOpen).toBe(true);
            act(() => { result.current.actions.handleProximityLost(); });
            expect(result.current.state.isDeckTwoOpen).toBe(true);
        });
    });
});

describe('nodeUtilsControllerReducer – PROXIMITY_LOST', () => {
    it('closes deck two and resets mode regardless of manual mode', () => {
        const state = { isDeckTwoOpen: true, mode: 'manual' as const, activeSubmenu: 'none' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'PROXIMITY_LOST' });
        expect(next.isDeckTwoOpen).toBe(false);
        expect(next.mode).toBe('auto');
    });

    it('does NOT close active submenu portal — state returned unchanged', () => {
        const state = { isDeckTwoOpen: false, mode: 'manual' as const, activeSubmenu: 'share' as const };
        const next = nodeUtilsControllerReducer(state, { type: 'PROXIMITY_LOST' });
        // Portal must remain mounted so user can interact with it
        expect(next).toBe(state);
    });

    it('returns same reference when already fully closed', () => {
        expect(nodeUtilsControllerReducer(initialNodeUtilsControllerState, { type: 'PROXIMITY_LOST' }))
            .toBe(initialNodeUtilsControllerState);
    });
});
