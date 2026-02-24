/**
 * useArrangeAnimation Hook Tests (TDD-first)
 * Verifies data-arranging attribute lifecycle for CSS transition animations
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArrangeAnimation } from '../useArrangeAnimation';

describe('useArrangeAnimation', () => {
    let containerDiv: HTMLDivElement;

    beforeEach(() => {
        vi.useFakeTimers();
        containerDiv = document.createElement('div');
        document.body.appendChild(containerDiv);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.removeChild(containerDiv);
    });

    it('should return an animatedArrange function', () => {
        const mockArrange = vi.fn();
        const ref = { current: containerDiv };
        const { result } = renderHook(() => useArrangeAnimation(ref, mockArrange));
        expect(typeof result.current.animatedArrange).toBe('function');
    });

    it('should set data-arranging attribute when called', () => {
        const mockArrange = vi.fn();
        const ref = { current: containerDiv };
        const { result } = renderHook(() => useArrangeAnimation(ref, mockArrange));

        act(() => { result.current.animatedArrange(); });

        expect(containerDiv.getAttribute('data-arranging')).toBe('true');
    });

    it('should call the arrange function', () => {
        const mockArrange = vi.fn();
        const ref = { current: containerDiv };
        const { result } = renderHook(() => useArrangeAnimation(ref, mockArrange));

        act(() => { result.current.animatedArrange(); });

        expect(mockArrange).toHaveBeenCalledOnce();
    });

    it('should remove data-arranging attribute after timeout', () => {
        const mockArrange = vi.fn();
        const ref = { current: containerDiv };
        const { result } = renderHook(() => useArrangeAnimation(ref, mockArrange));

        act(() => { result.current.animatedArrange(); });
        expect(containerDiv.getAttribute('data-arranging')).toBe('true');

        act(() => { vi.advanceTimersByTime(500); });
        expect(containerDiv.hasAttribute('data-arranging')).toBe(false);
    });

    it('should handle null ref gracefully', () => {
        const mockArrange = vi.fn();
        const ref = { current: null };
        const { result } = renderHook(() => useArrangeAnimation(ref, mockArrange));

        act(() => { result.current.animatedArrange(); });
        expect(mockArrange).toHaveBeenCalledOnce();
    });
});
