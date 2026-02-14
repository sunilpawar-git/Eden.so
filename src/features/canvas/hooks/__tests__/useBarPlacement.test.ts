/**
 * useBarPlacement Tests
 * Determines whether NodeUtilsBar should appear on right or left side
 * based on the node's proximity to the viewport edge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarPlacement } from '../useBarPlacement';
import { createRef } from 'react';

/** Default viewport width for tests */
const VIEWPORT_WIDTH = 1024;

/** Helper: create a ref with mocked getBoundingClientRect */
function createMockRef(right: number) {
    const ref = createRef<HTMLDivElement>();
    const div = document.createElement('div');
    div.getBoundingClientRect = vi.fn(() => ({
        top: 100, left: 100, right, bottom: 300,
        width: right - 100, height: 200, x: 100, y: 100,
        toJSON: vi.fn(),
    }));
    document.body.appendChild(div);
    Object.defineProperty(ref, 'current', { value: div, writable: false });
    return { ref, cleanup: () => div.remove() };
}

describe('useBarPlacement', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true, configurable: true, value: VIEWPORT_WIDTH,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns right when card is far from viewport edge', () => {
        const { ref, cleanup } = createMockRef(500);
        const { result } = renderHook(() => useBarPlacement(ref));

        expect(result.current).toBe('right');
        cleanup();
    });

    it('returns left when card right edge is within threshold of viewport', () => {
        const { ref, cleanup } = createMockRef(VIEWPORT_WIDTH - 40);
        const { result } = renderHook(() => useBarPlacement(ref));

        expect(result.current).toBe('left');
        cleanup();
    });

    it('returns right when card is exactly at threshold boundary', () => {
        const { ref, cleanup } = createMockRef(VIEWPORT_WIDTH - 60);
        const { result } = renderHook(() => useBarPlacement(ref));

        expect(result.current).toBe('right');
        cleanup();
    });

    it('recalculates on window resize', () => {
        const { ref, cleanup } = createMockRef(VIEWPORT_WIDTH - 40);
        const { result } = renderHook(() => useBarPlacement(ref));

        expect(result.current).toBe('left');

        act(() => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true, configurable: true, value: 2000,
            });
            window.dispatchEvent(new Event('resize'));
        });

        expect(result.current).toBe('right');
        cleanup();
    });

    it('returns right when ref is null', () => {
        const nullRef = createRef<HTMLElement>();
        const { result } = renderHook(() => useBarPlacement(nullRef));

        expect(result.current).toBe('right');
    });

    it('recalculates when isVisible changes (covers canvas pan)', () => {
        const div = document.createElement('div');
        let mockRight = VIEWPORT_WIDTH - 40; // starts near edge
        div.getBoundingClientRect = vi.fn(() => ({
            top: 100, left: 100, right: mockRight, bottom: 300,
            width: mockRight - 100, height: 200, x: 100, y: 100,
            toJSON: vi.fn(),
        }));
        document.body.appendChild(div);
        const ref = createRef<HTMLDivElement>();
        Object.defineProperty(ref, 'current', { value: div, writable: false });

        const { result, rerender } = renderHook(
            ({ visible }) => useBarPlacement(ref, visible),
            { initialProps: { visible: false } }
        );

        expect(result.current).toBe('left'); // near edge at initial calc

        // Simulate: user panned canvas so node is now far from edge
        mockRight = 500;
        rerender({ visible: true }); // hover triggers recalculation

        expect(result.current).toBe('right');
        div.remove();
    });
});
