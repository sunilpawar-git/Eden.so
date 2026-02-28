/**
 * Grid Layout Service — Variable-width node tests
 * Covers: wide nodes expanding column widths and neighbor-aware X positioning
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

describe('Grid Layout Service — Variable-width Nodes', () => {
    describe('arrangeMasonry with wide nodes', () => {
        it('should expand column width to accommodate widest node', () => {
            const nodes = [
                createMockNode('n0', { width: 472, createdAt: new Date('2024-01-01') }), // Col 0, wide
                createMockNode('n1', { width: 280, createdAt: new Date('2024-01-02') }), // Col 1
                createMockNode('n2', { width: 280, createdAt: new Date('2024-01-03') }), // Col 2
                createMockNode('n3', { width: 280, createdAt: new Date('2024-01-04') }), // Col 3
            ];

            const arranged = arrangeMasonry(nodes);

            expect(arranged.find(n => n.id === 'n0')!.position.x).toBe(32);
            // Col 1 x = 32 + 472 + 40 = 544 (shifted right to avoid overlap)
            expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(544);
            // Col 2 x = 544 + 280 + 40 = 864
            expect(arranged.find(n => n.id === 'n2')!.position.x).toBe(864);
            // Col 3 x = 864 + 280 + 40 = 1184
            expect(arranged.find(n => n.id === 'n3')!.position.x).toBe(1184);
        });

        it('should handle multiple wide nodes in different columns', () => {
            const nodes = [
                createMockNode('n0', { width: 376, createdAt: new Date('2024-01-01') }), // Col 0
                createMockNode('n1', { width: 280, createdAt: new Date('2024-01-02') }), // Col 1
                createMockNode('n2', { width: 472, createdAt: new Date('2024-01-03') }), // Col 2, wider
                createMockNode('n3', { width: 280, createdAt: new Date('2024-01-04') }), // Col 3
            ];

            const arranged = arrangeMasonry(nodes);

            expect(arranged.find(n => n.id === 'n0')!.position.x).toBe(32);
            // Col 1: x = 32 + 376 + 40 = 448
            expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(448);
            // Col 2: x = 448 + 280 + 40 = 768
            expect(arranged.find(n => n.id === 'n2')!.position.x).toBe(768);
            // Col 3: x = 768 + 472 + 40 = 1280
            expect(arranged.find(n => n.id === 'n3')!.position.x).toBe(1280);
        });

        it('should use neighbor-aware X positioning when stacking', () => {
            const nodes = [
                createMockNode('n0', { width: 280, createdAt: new Date('2024-01-01') }), // Col 0, y=32
                createMockNode('n1', { width: 280, createdAt: new Date('2024-01-02') }), // Col 1, y=32
                createMockNode('n2', { width: 280, createdAt: new Date('2024-01-03') }), // Col 2, y=32
                createMockNode('n3', { width: 280, createdAt: new Date('2024-01-04') }), // Col 3, y=32
                createMockNode('n4', { width: 472, createdAt: new Date('2024-01-05') }), // Col 0, y=292, wide
            ];

            const arranged = arrangeMasonry(nodes);

            const n4 = arranged.find(n => n.id === 'n4');
            expect(n4!.position.x).toBe(32); // Still in col 0

            // n1 (Col 1, y=32) does NOT overlap with n4 (y=292), so n1 stays at default col 1 x
            expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(352);
        });

        it('should maintain backward compatibility with default-width-only nodes', () => {
            const nodes = [
                createMockNode('n0', { createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
            ];

            const arranged = arrangeMasonry(nodes);

            expect(arranged.find(n => n.id === 'n0')!.position.x).toBe(32);
            expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(352);
            expect(arranged.find(n => n.id === 'n2')!.position.x).toBe(672);
            expect(arranged.find(n => n.id === 'n3')!.position.x).toBe(992);
        });
    });

    describe('calculateMasonryPosition with wide nodes', () => {
        it('should calculate next position accounting for wide node in column', () => {
            const nodes = [
                createMockNode('n0', { width: 472, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { width: 280, createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { width: 280, createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { width: 280, createdAt: new Date('2024-01-04') }),
            ];

            const result = calculateMasonryPosition(nodes);

            expect(result.x).toBe(32); // Shortest column is col 0
            expect(result.y).toBe(292); // Below first node
        });
    });
});
