/**
 * useEdgeProximity Tests — TDD RED phase
 * Returns true when cursor is within threshold of the card's right edge.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEdgeProximity } from '../useEdgeProximity';
import { createRef } from 'react';

/** Helper: create a ref with mocked getBoundingClientRect */
function createMockRef(left: number, right: number) {
    const ref = createRef<HTMLDivElement>();
    const div = document.createElement('div');
    div.getBoundingClientRect = vi.fn(() => ({
        top: 100, left, right, bottom: 300,
        width: right - left, height: 200, x: left, y: 100,
        toJSON: vi.fn(),
    }));
    document.body.appendChild(div);
    Object.defineProperty(ref, 'current', { value: div, writable: false });
    return { ref, cleanup: () => div.remove() };
}

/** Helper: dispatch mousemove at specific coordinates */
function moveMouse(clientX: number, clientY: number) {
    act(() => {
        document.dispatchEvent(new MouseEvent('mousemove', {
            clientX, clientY, bubbles: true,
        }));
    });
}

describe('useEdgeProximity', () => {
    beforeEach(() => {
        // Mock rAF to execute callback synchronously (jsdom has no real rAF loop)
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            cb(performance.now());
            return 0;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns false when cursor is far from card edge', () => {
        const { ref, cleanup } = createMockRef(100, 400);
        const { result } = renderHook(() => useEdgeProximity(ref));

        moveMouse(200, 200); // 200px from right edge (400)
        expect(result.current).toBe(false);
        cleanup();
    });

    it('returns true when cursor is within threshold of right edge', () => {
        const { ref, cleanup } = createMockRef(100, 400);
        const { result } = renderHook(() => useEdgeProximity(ref));

        moveMouse(395, 200); // 5px from right edge, within default 20px threshold
        expect(result.current).toBe(true);
        cleanup();
    });

    it('respects custom threshold value', () => {
        const { ref, cleanup } = createMockRef(100, 400);
        const { result } = renderHook(() => useEdgeProximity(ref, 10));

        moveMouse(385, 200); // 15px from edge, outside 10px threshold
        expect(result.current).toBe(false);

        moveMouse(395, 200); // 5px from edge, inside 10px threshold
        expect(result.current).toBe(true);
        cleanup();
    });

    it('returns false when cursor is vertically outside card bounds', () => {
        const { ref, cleanup } = createMockRef(100, 400);
        const { result } = renderHook(() => useEdgeProximity(ref));

        moveMouse(395, 50); // Near right edge horizontally but above card
        expect(result.current).toBe(false);
        cleanup();
    });

    it('returns false when ref is null', () => {
        const nullRef = createRef<HTMLElement>();
        const { result } = renderHook(() => useEdgeProximity(nullRef));

        moveMouse(395, 200);
        expect(result.current).toBe(false);
    });
});
