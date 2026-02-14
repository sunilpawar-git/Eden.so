/**
 * useBarPinOpen Tests — TDD RED phase
 * Right-click or long-press the peek indicator to keep the bar visible.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarPinOpen } from '../useBarPinOpen';

describe('useBarPinOpen', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('starts with isPinnedOpen as false', () => {
        const { result } = renderHook(() => useBarPinOpen());
        expect(result.current.isPinnedOpen).toBe(false);
    });

    it('toggles isPinnedOpen to true on contextmenu handler', () => {
        const { result } = renderHook(() => useBarPinOpen());

        act(() => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            result.current.handlers.onContextMenu(event as unknown as React.MouseEvent);
        });

        expect(result.current.isPinnedOpen).toBe(true);
    });

    it('toggles isPinnedOpen back to false on second contextmenu', () => {
        const { result } = renderHook(() => useBarPinOpen());

        act(() => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            result.current.handlers.onContextMenu(event as unknown as React.MouseEvent);
        });
        expect(result.current.isPinnedOpen).toBe(true);

        act(() => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            result.current.handlers.onContextMenu(event as unknown as React.MouseEvent);
        });
        expect(result.current.isPinnedOpen).toBe(false);
    });

    it('toggles isPinnedOpen on long-press (400ms)', () => {
        const { result } = renderHook(() => useBarPinOpen());

        act(() => {
            result.current.handlers.onTouchStart();
        });

        act(() => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current.isPinnedOpen).toBe(true);
    });

    it('does NOT toggle on short press (<400ms)', () => {
        const { result } = renderHook(() => useBarPinOpen());

        act(() => {
            result.current.handlers.onTouchStart();
        });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        act(() => {
            result.current.handlers.onTouchEnd();
        });

        expect(result.current.isPinnedOpen).toBe(false);
    });

    it('dismiss sets isPinnedOpen to false', () => {
        const { result } = renderHook(() => useBarPinOpen());

        // Open
        act(() => {
            const event = new MouseEvent('contextmenu', { bubbles: true });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            result.current.handlers.onContextMenu(event as unknown as React.MouseEvent);
        });
        expect(result.current.isPinnedOpen).toBe(true);

        // Dismiss
        act(() => {
            result.current.handlers.onDismiss();
        });
        expect(result.current.isPinnedOpen).toBe(false);
    });
});
