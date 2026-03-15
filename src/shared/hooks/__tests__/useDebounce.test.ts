import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedCallback } from '../useDebounce';

describe('useDebouncedCallback', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('delays invocation by the specified delay', () => {
        const spy = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(spy, 250));

        act(() => { result.current('a'); });
        expect(spy).not.toHaveBeenCalled();

        act(() => { vi.advanceTimersByTime(250); });
        expect(spy).toHaveBeenCalledWith('a');
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('resets timer on rapid calls — only fires the last value', () => {
        const spy = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(spy, 300));

        act(() => { result.current('x'); });
        act(() => { vi.advanceTimersByTime(100); });
        act(() => { result.current('y'); });
        act(() => { vi.advanceTimersByTime(100); });
        act(() => { result.current('z'); });

        act(() => { vi.advanceTimersByTime(300); });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith('z');
    });

    it('cleans up pending timer on unmount', () => {
        const spy = vi.fn();
        const { result, unmount } = renderHook(() => useDebouncedCallback(spy, 200));

        act(() => { result.current('a'); });
        unmount();
        act(() => { vi.advanceTimersByTime(200); });
        expect(spy).not.toHaveBeenCalled();
    });
});
