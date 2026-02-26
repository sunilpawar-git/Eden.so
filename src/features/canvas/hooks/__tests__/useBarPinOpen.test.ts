/**
 * useBarPinOpen Tests
 * Right-click or long-press to keep the bar visible. Escape dismisses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarPinOpen } from '../useBarPinOpen';
import { _resetEscapeLayer } from '@/shared/hooks/useEscapeLayer.testUtils';

/** Helper: fire contextmenu on the hook */
function fireContextMenu(result: { current: ReturnType<typeof useBarPinOpen> }) {
    act(() => {
        const event = new MouseEvent('contextmenu', { bubbles: true });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        result.current.handlers.onContextMenu(event as unknown as React.MouseEvent);
    });
}

describe('useBarPinOpen', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        _resetEscapeLayer();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('starts with isPinnedOpen as false', () => {
        const { result } = renderHook(() => useBarPinOpen());
        expect(result.current.isPinnedOpen).toBe(false);
    });

    it('toggles isPinnedOpen to true on contextmenu', () => {
        const { result } = renderHook(() => useBarPinOpen());
        fireContextMenu(result);
        expect(result.current.isPinnedOpen).toBe(true);
    });

    it('toggles isPinnedOpen back to false on second contextmenu', () => {
        const { result } = renderHook(() => useBarPinOpen());
        fireContextMenu(result);
        expect(result.current.isPinnedOpen).toBe(true);
        fireContextMenu(result);
        expect(result.current.isPinnedOpen).toBe(false);
    });

    it('toggles isPinnedOpen on long-press (400ms)', () => {
        const { result } = renderHook(() => useBarPinOpen());

        act(() => { result.current.handlers.onTouchStart(); });
        act(() => { vi.advanceTimersByTime(400); });

        expect(result.current.isPinnedOpen).toBe(true);
    });

    it('does NOT toggle on short press (<400ms)', () => {
        const { result } = renderHook(() => useBarPinOpen());

        act(() => { result.current.handlers.onTouchStart(); });
        act(() => { vi.advanceTimersByTime(200); });
        act(() => { result.current.handlers.onTouchEnd(); });

        expect(result.current.isPinnedOpen).toBe(false);
    });

    it('Escape key dismisses pinned state', () => {
        const { result } = renderHook(() => useBarPinOpen());
        fireContextMenu(result);
        expect(result.current.isPinnedOpen).toBe(true);

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
        expect(result.current.isPinnedOpen).toBe(false);
    });

    it('Escape does NOT dismiss when bar is not pinned', () => {
        const { result } = renderHook(() => useBarPinOpen());
        expect(result.current.isPinnedOpen).toBe(false);

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });
        expect(result.current.isPinnedOpen).toBe(false);
    });

    it('rapid touch does not double-toggle (timer race fix)', () => {
        const { result } = renderHook(() => useBarPinOpen());

        // First touch starts timer
        act(() => { result.current.handlers.onTouchStart(); });
        // Rapid second touch before first fires — should clear first timer
        act(() => { vi.advanceTimersByTime(200); });
        act(() => { result.current.handlers.onTouchStart(); });

        // Wait for second timer to fire (400ms from second touch)
        act(() => { vi.advanceTimersByTime(400); });

        // Should only toggle once (false -> true), not twice (false -> true -> false)
        expect(result.current.isPinnedOpen).toBe(true);
    });
});
