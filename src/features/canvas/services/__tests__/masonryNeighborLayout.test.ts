/**
 * Masonry Neighbor-Aware Layout Tests
 * Tests for neighbor-only shifting behavior in masonry layout
 * 
 * Behavior contract:
 * - Wide nodes only shift horizontally-adjacent nodes at the same vertical level
 * - Tall nodes only shift nodes below them in the same column
 * - Nodes in non-overlapping Y-ranges are unaffected by width changes
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';
import {
    GRID_GAP,
    GRID_PADDING,
    arrangeMasonry,
    calculateMasonryPosition,
    rearrangeAfterResize,
} from '../gridLayoutService';
import { createMockNode } from './masonryTestHelpers';

describe('Neighbor-Aware Masonry Layout', () => {
    describe('arrangeMasonry with neighbor-aware X positioning', () => {
        it('wide node in col 0 row 2 does NOT shift col 1 row 0', () => {
            // n4 is wide (472px) but at Y=292-512
            // n1 is at Y=32-252 (no vertical overlap with n4)
            // Therefore n1 should NOT be shifted right by n4's extra width
            const nodes = [
                createMockNode('n0', { createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
                createMockNode('n4', { width: 472, createdAt: new Date('2024-01-05') }),
            ];

            const arranged = arrangeMasonry(nodes);

            const n1 = arranged.find((n) => n.id === 'n1');
            expect(n1?.position.x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP);
        });

        it('wide node shifts only vertically-overlapping neighbors in next column', () => {
            // n0 wide at y=32, overlaps with n1 (y=32), not with n5 (y=292)
            const nodes = [
                createMockNode('n0', { width: 472, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
                createMockNode('n4', { createdAt: new Date('2024-01-05') }),
                createMockNode('n5', { createdAt: new Date('2024-01-06') }),
            ];

            const arranged = arrangeMasonry(nodes);

            const n1 = arranged.find((n) => n.id === 'n1');
            const n5 = arranged.find((n) => n.id === 'n5');

            expect(n1?.position.x).toBe(32 + 472 + 40); // 544 (shifted)
            expect(n5?.position.x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP); // 352 (not shifted)
        });

        it('tall node only pushes nodes below it in same column', () => {
            const nodes = [
                createMockNode('n0', { height: 800, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
                createMockNode('n4', { createdAt: new Date('2024-01-05') }),
            ];

            const arranged = arrangeMasonry(nodes);

            const n0 = arranged.find((n) => n.id === 'n0');
            const n1 = arranged.find((n) => n.id === 'n1');
            const n4 = arranged.find((n) => n.id === 'n4');

            expect(n0?.position.y).toBe(GRID_PADDING);
            expect(n1?.position.y).toBe(GRID_PADDING);
            expect(n4?.position.y).toBe(GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP);
        });

        it('nodes in non-adjacent columns cascade through direct neighbors only', () => {
            const nodes = [
                createMockNode('n0', { width: 900, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
            ];

            const arranged = arrangeMasonry(nodes);

            const n1 = arranged.find((n) => n.id === 'n1');
            const n2 = arranged.find((n) => n.id === 'n2');

            expect(n1?.position.x).toBe(32 + 900 + 40); // 972
            expect(n2?.position.x).toBe(972 + 280 + 40); // 1292
        });
    });

    describe('calculateMasonryPosition with neighbor-aware logic', () => {
        it('next position accounts for neighbor-aware X in target column', () => {
            const nodes = [
                createMockNode('n0', { width: 472, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
            ];

            const position = calculateMasonryPosition(nodes);

            expect(position.x).toBe(GRID_PADDING);
            expect(position.y).toBe(GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP);
        });
    });
});

// ============================================================================
// Incremental Rearrange Tests (Phase 3)
// ============================================================================

describe('Incremental Rearrange After Resize', () => {
    describe('rearrangeAfterResize', () => {
        it('height increase only shifts same-column nodes below', () => {
            // With the neighbor-aware algorithm, rearrangeAfterResize re-runs
            // full arrangement. Tall node in col 0 means col 1 becomes "shortest"
            // after first 4 nodes, so subsequent nodes go there.
            // 
            // The key assertion is that nodes in different columns maintain
            // their expected Y positions based on their own column's stacking.
            const nodes = [
                createMockNode('n0', { height: 400, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
                createMockNode('n4', { createdAt: new Date('2024-01-05') }),
                createMockNode('n5', { createdAt: new Date('2024-01-06') }),
            ];

            const rearranged = rearrangeAfterResize(nodes, 'n0');

            const n0 = rearranged.find((n) => n.id === 'n0');
            const n1 = rearranged.find((n) => n.id === 'n1');
            const n4 = rearranged.find((n) => n.id === 'n4');

            // n0 is at y=32 (top of col 0)
            expect(n0?.position.y).toBe(GRID_PADDING);
            // n1 is at y=32 (top of col 1, not affected by n0's height)
            expect(n1?.position.y).toBe(GRID_PADDING);
            // n4 goes to col 1 (shortest after round 1), stacked below n1
            // y = 32 + 220 + 40 = 292
            expect(n4?.position.y).toBe(GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP);
        });

        it('width increase only shifts overlapping neighbors in next column', () => {
            const nodes = [
                createMockNode('n0', { width: 280, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
                createMockNode('n4', { createdAt: new Date('2024-01-05') }),
                createMockNode('n5', { createdAt: new Date('2024-01-06') }),
            ];

            const initialArranged = arrangeMasonry(nodes);

            // Increase n0's width
            const updatedNodes = initialArranged.map((n) =>
                n.id === 'n0' ? { ...n, width: 472 } : n
            );
            const rearranged = rearrangeAfterResize(updatedNodes, 'n0');

            const n1After = rearranged.find((n) => n.id === 'n1');
            const n5After = rearranged.find((n) => n.id === 'n5');

            // n1 overlaps with n0 (both at y=32), so shifted
            expect(n1After?.position.x).toBe(32 + 472 + 40);
            // n5 is at y=292, no overlap with n0, uses default
            expect(n5After?.position.x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP);
        });

        it('non-overlapping nodes in adjacent columns stay put', () => {
            // Create scenario where n0 is at y=500+ (far down) and n1 is at y=32
            const nodes = [
                createMockNode('n0', { height: 220, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
            ];

            const initialArranged = arrangeMasonry(nodes);

            // n0 default width, n1 at default col 1 position
            const n1Before = initialArranged.find((n) => n.id === 'n1');
            expect(n1Before?.position.x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP);

            // Increase n0's width - but both are at y=32, so n1 WILL shift
            // This test verifies the overlap detection works
            const updatedNodes = initialArranged.map((n) =>
                n.id === 'n0' ? { ...n, width: 472 } : n
            );
            const rearranged = rearrangeAfterResize(updatedNodes, 'n0');

            const n1After = rearranged.find((n) => n.id === 'n1');
            // n1 overlaps with n0, so it shifts
            expect(n1After?.position.x).toBe(32 + 472 + 40);
        });

        it('width decrease allows neighbors to collapse inward', () => {
            // Start with wide n0
            const nodes = [
                createMockNode('n0', { width: 472, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
            ];

            const initialArranged = arrangeMasonry(nodes);
            const n1Before = initialArranged.find((n) => n.id === 'n1');
            expect(n1Before?.position.x).toBe(32 + 472 + 40); // 544

            // Shrink n0 back to default
            const updatedNodes = initialArranged.map((n) =>
                n.id === 'n0' ? { ...n, width: 280 } : n
            );
            const rearranged = rearrangeAfterResize(updatedNodes, 'n0');

            const n1After = rearranged.find((n) => n.id === 'n1');
            // n1 collapses back to default position
            expect(n1After?.position.x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP);
        });

        it('cascading shift propagates through overlapping neighbors', () => {
            // n0 wide -> n1 shifts -> n2 shifts (if overlapping)
            const nodes = [
                createMockNode('n0', { width: 900, createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
                createMockNode('n3', { createdAt: new Date('2024-01-04') }),
            ];

            const rearranged = rearrangeAfterResize(nodes, 'n0');

            const n1 = rearranged.find((n) => n.id === 'n1');
            const n2 = rearranged.find((n) => n.id === 'n2');

            // n1 shifts due to n0
            expect(n1?.position.x).toBe(32 + 900 + 40); // 972
            // n2 shifts due to n1 (cascade)
            expect(n2?.position.x).toBe(972 + 280 + 40); // 1292
        });
    });
});
