/**
 * useBrowserZoomLock — TDD tests.
 *
 * The bug: pinch-to-zoom on the canvas sometimes zooms the entire browser UI
 * (sidebar, toolbar, everything) instead of only the ReactFlow canvas.
 *
 * Root cause: the browser's native pinch-zoom is NOT suppressed.
 *  - On Chrome/Firefox trackpads, pinch fires `wheel` events with `ctrlKey: true`.
 *  - On Safari, pinch fires `gesturestart` / `gesturechange` events.
 *  - Neither is intercepted at the document level, so the browser compositor
 *    races ReactFlow and sometimes wins, scaling the entire viewport.
 *
 * The hook should attach document-level listeners that `preventDefault()` on
 * these events so only ReactFlow's internal zoom handler controls the canvas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBrowserZoomLock } from '../useBrowserZoomLock';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Dispatch a wheel event on document with given options. */
function fireWheelEvent(opts: WheelEventInit & { ctrlKey?: boolean } = {}): WheelEvent {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...opts });
    document.dispatchEvent(event);
    return event;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('useBrowserZoomLock', () => {
    let addSpy: ReturnType<typeof vi.spyOn>;
    let removeSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        addSpy = vi.spyOn(document, 'addEventListener');
        removeSpy = vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
        addSpy.mockRestore();
        removeSpy.mockRestore();
    });

    /* ----- Listener registration ---------------------------------- */

    it('registers a wheel listener on document on mount', () => {
        renderHook(() => useBrowserZoomLock());
        const wheelCalls = addSpy.mock.calls.filter(([type]) => type === 'wheel');
        expect(wheelCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('registers wheel listener as non-passive so preventDefault works', () => {
        renderHook(() => useBrowserZoomLock());
        const wheelCall = addSpy.mock.calls.find(([type]) => type === 'wheel');
        expect(wheelCall).toBeDefined();
        const options = wheelCall![2] as AddEventListenerOptions;
        expect(options.passive).toBe(false);
    });

    it('registers gesturestart listener on document (Safari pinch)', () => {
        renderHook(() => useBrowserZoomLock());
        const calls = addSpy.mock.calls.filter(([type]) => type === 'gesturestart');
        expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it('registers gesturechange listener on document (Safari pinch)', () => {
        renderHook(() => useBrowserZoomLock());
        const calls = addSpy.mock.calls.filter(([type]) => type === 'gesturechange');
        expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    /* ----- Ctrl+wheel prevention ---------------------------------- */

    it('calls preventDefault on wheel events with ctrlKey (trackpad pinch)', () => {
        renderHook(() => useBrowserZoomLock());
        const event = fireWheelEvent({ ctrlKey: true, deltaY: -100 });
        expect(event.defaultPrevented).toBe(true);
    });

    it('does NOT call preventDefault on normal wheel events (no ctrlKey)', () => {
        renderHook(() => useBrowserZoomLock());
        const event = fireWheelEvent({ ctrlKey: false, deltaY: -100 });
        expect(event.defaultPrevented).toBe(false);
    });

    it('does NOT call preventDefault on wheel events with metaKey only', () => {
        renderHook(() => useBrowserZoomLock());
        const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, metaKey: true, deltaY: -100 });
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
    });

    /* ----- Gesture event prevention (Safari) ---------------------- */

    it('calls preventDefault on gesturestart events', () => {
        renderHook(() => useBrowserZoomLock());
        const event = new Event('gesturestart', { bubbles: true, cancelable: true });
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
    });

    it('calls preventDefault on gesturechange events', () => {
        renderHook(() => useBrowserZoomLock());
        const event = new Event('gesturechange', { bubbles: true, cancelable: true });
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
    });

    /* ----- Cleanup ------------------------------------------------ */

    it('removes all listeners on unmount', () => {
        const { unmount } = renderHook(() => useBrowserZoomLock());
        unmount();

        const removedTypes = removeSpy.mock.calls.map(([type]) => type);
        expect(removedTypes).toContain('wheel');
        expect(removedTypes).toContain('gesturestart');
        expect(removedTypes).toContain('gesturechange');
    });

    it('does NOT call preventDefault after unmount', () => {
        const { unmount } = renderHook(() => useBrowserZoomLock());
        unmount();

        const event = fireWheelEvent({ ctrlKey: true, deltaY: -100 });
        expect(event.defaultPrevented).toBe(false);
    });
});
