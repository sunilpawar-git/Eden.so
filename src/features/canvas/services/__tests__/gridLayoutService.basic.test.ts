/**
 * Grid Layout Service — Basic masonry positioning tests
 * Covers: calculateMasonryPosition and arrangeMasonry core behaviour
 */
import { describe, it, expect } from 'vitest';
import { calculateMasonryPosition, arrangeMasonry } from '../gridLayoutService';
import type { CanvasNode } from '../../types/node';

const createMockNode = (id: string, overrides?: Partial<CanvasNode>): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    width: 280,
    height: 220,
    data: { prompt: '', output: '', tags: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('Grid Layout Service — Basic Masonry', () => {
    describe('calculateMasonryPosition', () => {
        it('should place first node at padded origin in first column', () => {
            const result = calculateMasonryPosition([]);
            expect(result).toEqual({ x: 32, y: 32 });
        });

        it('should fill columns sequentially when empty', () => {
            const nodes = [createMockNode('n0', { position: { x: 32, y: 32 } })];
            const result = calculateMasonryPosition(nodes);

            // x = 32 + 280 + 40 = 352
            expect(result.x).toBe(352);
            expect(result.y).toBe(32);
        });

        it('should place next node in the SHORTEST column (Masonry Logic)', () => {
            // Col 0: tall (800px) -> ends at 872; Cols 1-3: standard (220px) -> end at 292
            const nodes = [
                createMockNode('n0', { height: 800, position: { x: 32, y: 32 }, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { height: 220, position: { x: 352, y: 32 }, createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { height: 220, position: { x: 672, y: 32 }, createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { height: 220, position: { x: 992, y: 32 }, createdAt: new Date('2024-01-04') }),
            ];

            const result = calculateMasonryPosition(nodes);

            expect(result.x).toBe(352); // Col 1 (shortest)
            expect(result.y).toBe(292); // 32 + 220 + 40
        });
    });

    describe('arrangeMasonry', () => {
        it('should rearrange existing nodes using shortest-column logic', () => {
            const nodes = [
                createMockNode('n0', { height: 800, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { height: 220, createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { height: 220, createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { height: 220, createdAt: new Date('2024-01-04') }),
                createMockNode('n4', { height: 220, createdAt: new Date('2024-01-05') }),
            ];

            const arranged = arrangeMasonry(nodes);

            const n4 = arranged.find(n => n.id === 'n4');
            expect(n4).toBeDefined();
            // Should be in Col 1 (x=352), below n1 (y=292)
            expect(n4!.position.x).toBe(352);
            expect(n4!.position.y).toBe(292);
        });
    });
});
