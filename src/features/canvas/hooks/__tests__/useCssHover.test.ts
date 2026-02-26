/**
 * useCssHover tests — Verifies ref-based hover tracking
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCssHover } from '../useCssHover';

function createMockElement(): HTMLElement {
    const listeners: Record<string, EventListener[]> = {};
    return {
        addEventListener: vi.fn((event: string, cb: EventListener) => {
            (listeners[event] ??= []).push(cb);
        }),
        removeEventListener: vi.fn((event: string, cb: EventListener) => {
            const arr = listeners[event];
            if (arr) {
                const idx = arr.indexOf(cb);
                if (idx >= 0) arr.splice(idx, 1);
            }
        }),
        dispatchEvent: (event: Event) => {
            const arr = listeners[event.type];
            if (arr) arr.forEach((cb) => cb(event));
        },
    } as unknown as HTMLElement;
}

describe('useCssHover', () => {
    afterEach(() => { vi.restoreAllMocks(); });

    it('starts as not hovered', () => {
        const ref = { current: createMockElement() };
        const { result } = renderHook(() => useCssHover(ref));
        expect(result.current).toBe(false);
    });

    it('returns true on mouseenter', () => {
        const el = createMockElement();
        const ref = { current: el };
        const { result } = renderHook(() => useCssHover(ref));

        act(() => { el.dispatchEvent(new Event('mouseenter')); });
        expect(result.current).toBe(true);
    });

    it('returns false on mouseleave after mouseenter', () => {
        const el = createMockElement();
        const ref = { current: el };
        const { result } = renderHook(() => useCssHover(ref));

        act(() => { el.dispatchEvent(new Event('mouseenter')); });
        expect(result.current).toBe(true);

        act(() => { el.dispatchEvent(new Event('mouseleave')); });
        expect(result.current).toBe(false);
    });

    it('cleans up listeners on unmount', () => {
        const el = createMockElement();
        const ref = { current: el };
        const { unmount } = renderHook(() => useCssHover(ref));

        unmount();
        expect(el.removeEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
        expect(el.removeEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });

    it('handles null ref gracefully', () => {
        const ref = { current: null };
        const { result } = renderHook(() => useCssHover(ref));
        expect(result.current).toBe(false);
    });
});
