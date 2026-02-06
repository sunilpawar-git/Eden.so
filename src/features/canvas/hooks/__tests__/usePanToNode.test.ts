/**
 * Tests for usePanToNode Hook
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePanToNode } from '../usePanToNode';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';

// Mock useReactFlow
const mockSetCenter = vi.fn();
vi.mock('@xyflow/react', () => ({
    useReactFlow: () => ({
        setCenter: mockSetCenter,
    }),
}));

describe('usePanToNode', () => {
    it('should calculate center position correctly', () => {
        const { result } = renderHook(() => usePanToNode());

        // Test position (0,0)
        result.current.panToPosition(0, 0);

        const expectedCenterX = 0 + DEFAULT_NODE_WIDTH / 2;
        const expectedCenterY = 0 + DEFAULT_NODE_HEIGHT / 2;

        expect(mockSetCenter).toHaveBeenCalledWith(
            expectedCenterX,
            expectedCenterY,
            expect.objectContaining({ zoom: 1, duration: 800 })
        );
    });

    it('should respect custom options', () => {
        const { result } = renderHook(() => usePanToNode());

        result.current.panToPosition(100, 100, { zoom: 2, duration: 500 });

        expect(mockSetCenter).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Number),
            { zoom: 2, duration: 500 }
        );
    });
});
