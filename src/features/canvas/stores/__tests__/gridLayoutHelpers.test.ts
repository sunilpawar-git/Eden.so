/**
 * Tests for Grid Layout Helpers (arrangeNodesInGrid, calculateNextNodePosition)
 * Extracted from canvasStoreHelpers.test.ts to maintain <300 line limit
 */
import { describe, it, expect } from 'vitest';
import {
    arrangeNodesInGrid,
    calculateNextNodePosition,
} from '../canvasStoreHelpers';
import type { CanvasNode } from '../../types/node';

const createMockNode = (id: string, overrides?: Partial<CanvasNode>): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    data: { prompt: '', output: '', tags: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('Grid Layout Helpers', () => {
    describe('arrangeNodesInGrid', () => {
        it('should arrange nodes in a 4-column grid', () => {
            const baseDate = new Date('2024-01-01');
            const nodes = [
                createMockNode('n1', { createdAt: new Date(baseDate.getTime() + 1000) }),
                createMockNode('n2', { createdAt: new Date(baseDate.getTime() + 2000) }),
                createMockNode('n3', { createdAt: new Date(baseDate.getTime() + 3000) }),
                createMockNode('n4', { createdAt: new Date(baseDate.getTime() + 4000) }),
                createMockNode('n5', { createdAt: new Date(baseDate.getTime() + 5000) }),
            ];

            const result = arrangeNodesInGrid(nodes);

            // Node 5 should be on row 2 (index 4, col 0)
            expect(result[4]!.position.x).toBe(0);
            expect(result[4]!.position.y).toBeGreaterThan(0);
        });

        it('should sort nodes by createdAt before arranging', () => {
            const nodes = [
                createMockNode('n2', { createdAt: new Date('2024-01-02') }),
                createMockNode('n1', { createdAt: new Date('2024-01-01') }),
            ];

            const result = arrangeNodesInGrid(nodes);

            // n1 should be first (earlier date) at position 0,0
            expect(result[0]!.id).toBe('n1');
            expect(result[0]!.position.x).toBe(0);
            expect(result[0]!.position.y).toBe(0);
        });

        it('should return empty array for empty input', () => {
            const result = arrangeNodesInGrid([]);
            expect(result).toHaveLength(0);
        });

        it('should not mutate original nodes array', () => {
            const nodes = [createMockNode('n1')];
            const originalPos = { ...nodes[0]!.position };

            arrangeNodesInGrid(nodes);

            expect(nodes[0]!.position).toEqual(originalPos);
        });
    });

    describe('calculateNextNodePosition', () => {
        it('should return origin for empty nodes array', () => {
            const result = calculateNextNodePosition([]);

            expect(result.x).toBe(0);
            expect(result.y).toBe(0);
        });

        it('should return next slot in first row when less than 4 nodes', () => {
            const nodes = [
                createMockNode('n1'),
                createMockNode('n2'),
            ];

            const result = calculateNextNodePosition(nodes);

            // 3rd node should be at column 2 (index 2)
            expect(result.x).toBeGreaterThan(0);
            expect(result.y).toBe(0);
        });

        it('should wrap to second row after 4 nodes', () => {
            const nodes = Array.from({ length: 4 }, (_, i) => createMockNode(`n${i}`));

            const result = calculateNextNodePosition(nodes);

            // 5th node should be at row 1, column 0
            expect(result.x).toBe(0);
            expect(result.y).toBeGreaterThan(0);
        });

        it('should calculate correct position for 9th node', () => {
            const nodes = Array.from({ length: 8 }, (_, i) => createMockNode(`n${i}`));

            const result = calculateNextNodePosition(nodes);

            // 9th node: row 2, column 0
            expect(result.x).toBe(0);
        });
    });
});
