import { describe, it, expect } from 'vitest';
import { calculateMasonryPosition, arrangeMasonry } from '../gridLayoutService';
import type { CanvasNode } from '../../types/node';

// Mock Node Factory
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

describe('Grid Layout Service (Masonry)', () => {
    describe('calculateMasonryPosition', () => {
        it('should place first node at padded origin in first column', () => {
            const result = calculateMasonryPosition([]);
            expect(result).toEqual({ x: 32, y: 32 });
        });

        it('should fill columns sequentially when empty', () => {
            // 1 node present (col 0) -> next should be col 1
            const nodes = [createMockNode('n0', { position: { x: 32, y: 32 } })];
            const result = calculateMasonryPosition(nodes);

            // Should be at col 1 x-position, same y (32)
            // x = 32 + 280 + 40 = 352
            expect(result.x).toBe(352);
            expect(result.y).toBe(32);
        });

        it('should place next node in the SHORTEST column (Masonry Logic)', () => {
            // Scenario: 
            // Col 0: Tall node (800px) -> y ends at 872
            // Col 1: Standard node (220px) -> y ends at 292
            // Col 2: Standard node (220px) -> y ends at 292
            // Col 3: Standard node (220px) -> y ends at 292
            // Next node should go to Col 1 (or 2/3), NOT Col 0

            const nodes = [
                createMockNode('n0', { height: 800, position: { x: 32, y: 32 }, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { height: 220, position: { x: 352, y: 32 }, createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { height: 220, position: { x: 672, y: 32 }, createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { height: 220, position: { x: 992, y: 32 }, createdAt: new Date('2024-01-04') }),
            ];

            const result = calculateMasonryPosition(nodes);

            // Expect it to skip Col 0 (because it's tall) and pick Col 1 (which is shortest/tied)
            expect(result.x).toBe(352); // Col 1
            expect(result.y).toBe(292); // 32 (pad) + 220 (height) + 40 (gap)
        });
    });

    describe('arrangeMasonry', () => {
        it('should rearrange existing nodes using shortest-column logic', () => {
            const nodes = [
                createMockNode('n0', { height: 800, createdAt: new Date('2024-01-01') }), // Col 0
                createMockNode('n1', { height: 220, createdAt: new Date('2024-01-02') }), // Col 1
                createMockNode('n2', { height: 220, createdAt: new Date('2024-01-03') }), // Col 2
                createMockNode('n3', { height: 220, createdAt: new Date('2024-01-04') }), // Col 3
                createMockNode('n4', { height: 220, createdAt: new Date('2024-01-05') }), // Should go to Col 1!
            ];

            const arranged = arrangeMasonry(nodes);

            // Check n4 position
            const n4 = arranged.find(n => n.id === 'n4');
            expect(n4).toBeDefined();
            // Should be in Col 1 (x=352), below n1 (y=292)
            expect(n4!.position.x).toBe(352);
            expect(n4!.position.y).toBe(292);
        });
    });
});
