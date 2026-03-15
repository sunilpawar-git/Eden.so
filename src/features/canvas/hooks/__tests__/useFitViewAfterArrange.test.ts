/**
 * useFitViewAfterArrange — Unit tests
 * Verifies fitView is called with correct params after the arrange event,
 * timer cleanup on unmount, and rapid-fire debouncing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFitViewAfterArrange, FIT_VIEW_AFTER_ARRANGE_EVENT } from '../useFitViewAfterArrange';

const mockFitView = vi.fn().mockResolvedValue(undefined);

vi.mock('@xyflow/react', () => ({
    useReactFlow: () => ({ fitView: mockFitView }),
}));

describe('useFitViewAfterArrange', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockFitView.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls fitView after arrange event with delay', async () => {
        renderHook(() => useFitViewAfterArrange());

        window.dispatchEvent(new CustomEvent(FIT_VIEW_AFTER_ARRANGE_EVENT, {
            detail: { totalAnimMs: 400 },
        }));

        vi.advanceTimersByTime(501);
        await vi.runAllTimersAsync();

        expect(mockFitView).toHaveBeenCalledWith({
            padding: 0.12,
            duration: 500,
        });
    });

    it('does not call fitView before delay elapses', () => {
        renderHook(() => useFitViewAfterArrange());

        window.dispatchEvent(new CustomEvent(FIT_VIEW_AFTER_ARRANGE_EVENT, {
            detail: { totalAnimMs: 400 },
        }));

        vi.advanceTimersByTime(200);
        expect(mockFitView).not.toHaveBeenCalled();
    });

    it('exports event name constant', () => {
        expect(FIT_VIEW_AFTER_ARRANGE_EVENT).toBe('fit-view-after-arrange');
    });

    it('rapid-fire events only produce one fitView call', async () => {
        renderHook(() => useFitViewAfterArrange());

        for (let i = 0; i < 5; i++) {
            window.dispatchEvent(new CustomEvent(FIT_VIEW_AFTER_ARRANGE_EVENT, {
                detail: { totalAnimMs: 300 },
            }));
        }

        vi.advanceTimersByTime(401);
        await vi.runAllTimersAsync();

        expect(mockFitView).toHaveBeenCalledTimes(1);
    });

    it('clears pending timer on unmount', () => {
        const { unmount } = renderHook(() => useFitViewAfterArrange());

        window.dispatchEvent(new CustomEvent(FIT_VIEW_AFTER_ARRANGE_EVENT, {
            detail: { totalAnimMs: 400 },
        }));

        unmount();

        vi.advanceTimersByTime(600);
        expect(mockFitView).not.toHaveBeenCalled();
    });

    it('uses fallback delay when detail has no totalAnimMs', async () => {
        renderHook(() => useFitViewAfterArrange());

        window.dispatchEvent(new CustomEvent(FIT_VIEW_AFTER_ARRANGE_EVENT, {
            detail: {},
        }));

        vi.advanceTimersByTime(501);
        await vi.runAllTimersAsync();

        expect(mockFitView).toHaveBeenCalledWith({
            padding: 0.12,
            duration: 500,
        });
    });
});
