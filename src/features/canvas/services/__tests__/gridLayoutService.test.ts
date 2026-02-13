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

    describe('Flexible Column Widths (Variable-width nodes)', () => {
        describe('arrangeMasonry with wide nodes', () => {
            it('should expand column width to accommodate widest node', () => {
                // Node 0 is wider (472px) in column 0
                // Other nodes are default width (280px)
                const nodes = [
                    createMockNode('n0', { width: 472, createdAt: new Date('2024-01-01') }), // Col 0, wide
                    createMockNode('n1', { width: 280, createdAt: new Date('2024-01-02') }), // Col 1
                    createMockNode('n2', { width: 280, createdAt: new Date('2024-01-03') }), // Col 2
                    createMockNode('n3', { width: 280, createdAt: new Date('2024-01-04') }), // Col 3
                ];

                const arranged = arrangeMasonry(nodes);

                // Col 0 x = 32 (padding)
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
                    createMockNode('n0', { width: 376, createdAt: new Date('2024-01-01') }), // Col 0, wide
                    createMockNode('n1', { width: 280, createdAt: new Date('2024-01-02') }), // Col 1, default
                    createMockNode('n2', { width: 472, createdAt: new Date('2024-01-03') }), // Col 2, wider
                    createMockNode('n3', { width: 280, createdAt: new Date('2024-01-04') }), // Col 3, default
                ];

                const arranged = arrangeMasonry(nodes);

                // Col 0: x = 32
                expect(arranged.find(n => n.id === 'n0')!.position.x).toBe(32);
                
                // Col 1: x = 32 + 376 + 40 = 448
                expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(448);
                
                // Col 2: x = 448 + 280 + 40 = 768
                expect(arranged.find(n => n.id === 'n2')!.position.x).toBe(768);
                
                // Col 3: x = 768 + 472 + 40 = 1280
                expect(arranged.find(n => n.id === 'n3')!.position.x).toBe(1280);
            });

            it('should use neighbor-aware X positioning when stacking', () => {
                // Two nodes in column 0: one default (row 0), one wide (row 1)
                // With neighbor-aware layout, n1 (col 1 row 0) does NOT shift
                // because n4 (col 0 row 1) does not vertically overlap with n1
                const nodes = [
                    createMockNode('n0', { width: 280, createdAt: new Date('2024-01-01') }), // Col 0, y=32
                    createMockNode('n1', { width: 280, createdAt: new Date('2024-01-02') }), // Col 1, y=32
                    createMockNode('n2', { width: 280, createdAt: new Date('2024-01-03') }), // Col 2, y=32
                    createMockNode('n3', { width: 280, createdAt: new Date('2024-01-04') }), // Col 3, y=32
                    createMockNode('n4', { width: 472, createdAt: new Date('2024-01-05') }), // Col 0, y=292 (stacked), WIDE
                ];

                const arranged = arrangeMasonry(nodes);

                // n4 is in Col 0 at y=292
                const n4 = arranged.find(n => n.id === 'n4');
                expect(n4!.position.x).toBe(32); // Still in col 0

                // n1 (Col 1, y=32) does NOT overlap with n4 (y=292)
                // So n1 stays at default col 1 X position: 32 + 280 + 40 = 352
                expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(352);
            });

            it('should maintain backward compatibility with default-width-only nodes', () => {
                // All default width nodes - should produce same layout as before
                const nodes = [
                    createMockNode('n0', { createdAt: new Date('2024-01-01') }),
                    createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                    createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                    createMockNode('n3', { createdAt: new Date('2024-01-04') }),
                ];

                const arranged = arrangeMasonry(nodes);

                // Same as original layout
                expect(arranged.find(n => n.id === 'n0')!.position.x).toBe(32);
                expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(352);
                expect(arranged.find(n => n.id === 'n2')!.position.x).toBe(672);
                expect(arranged.find(n => n.id === 'n3')!.position.x).toBe(992);
            });
        });

        describe('calculateMasonryPosition with wide nodes', () => {
            it('should calculate next position accounting for wide node in column', () => {
                // Wide node in column 0, others default
                const nodes = [
                    createMockNode('n0', { width: 472, createdAt: new Date('2024-01-01') }),
                    createMockNode('n1', { width: 280, createdAt: new Date('2024-01-02') }),
                    createMockNode('n2', { width: 280, createdAt: new Date('2024-01-03') }),
                    createMockNode('n3', { width: 280, createdAt: new Date('2024-01-04') }),
                ];

                const result = calculateMasonryPosition(nodes);

                // Next node goes to shortest column (col 0, 1, 2, or 3 - all same height)
                // If col 0, x = 32
                // If col 1, x = 32 + 472 + 40 = 544
                expect(result.x).toBe(32); // First shortest column
                expect(result.y).toBe(292); // Below first node
            });
        });
    });
});
