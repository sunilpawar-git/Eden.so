/**
 * Spiral Placement — Unit tests
 * Covers: empty canvas, single collision, ring of nodes,
 * dense grid, MAX_SPIRAL_RINGS cap, fallback behavior.
 */
import { describe, it, expect } from 'vitest';
import { findNearestOpenSlot, MAX_SPIRAL_RINGS } from '../spiralPlacement';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';
import type { CanvasNode } from '../../types/node';
import { GRID_GAP } from '../gridConstants';

function makeNode(id: string, x: number, y: number, w?: number, h?: number): CanvasNode {
    return {
        id,
        workspaceId: 'ws-test',
        type: 'idea',
        position: { x, y },
        width: w ?? DEFAULT_NODE_WIDTH,
        height: h ?? DEFAULT_NODE_HEIGHT,
        data: { heading: '' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    } as CanvasNode;
}

describe('findNearestOpenSlot', () => {
    it('returns anchor position when canvas is empty', () => {
        const result = findNearestOpenSlot(100, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, []);
        expect(result).toEqual({ x: 100, y: 100 });
    });

    it('returns anchor position when no collision', () => {
        const nodes = [makeNode('n1', 0, 0)];
        const result = findNearestOpenSlot(500, 500, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes);
        expect(result).toEqual({ x: 500, y: 500 });
    });

    it('finds open slot to the right of a single collision', () => {
        const nodes = [makeNode('n1', 100, 100)];
        const result = findNearestOpenSlot(100, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes);

        expect(result.x).not.toBe(100);
        expect(result.y).not.toBe(undefined);
        expect(Number.isFinite(result.x)).toBe(true);
        expect(Number.isFinite(result.y)).toBe(true);
    });

    it('avoids collision from first ring direction (right)', () => {
        const nodes = [makeNode('n1', 100, 100)];
        const result = findNearestOpenSlot(100, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes);

        const stepX = DEFAULT_NODE_WIDTH + GRID_GAP;
        expect(result.x).toBe(100 + stepX);
        expect(result.y).toBe(100);
    });

    it('tries second direction when right is also blocked', () => {
        const stepX = DEFAULT_NODE_WIDTH + GRID_GAP;
        const nodes = [
            makeNode('n1', 100, 100),
            makeNode('n2', 100 + stepX, 100),
        ];
        const result = findNearestOpenSlot(100, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes);

        const stepY = DEFAULT_NODE_HEIGHT + GRID_GAP;
        expect(result.x).toBe(100 + stepX);
        expect(result.y).toBe(100 + stepY);
    });

    it('handles nodes of varying sizes', () => {
        const nodes = [makeNode('n1', 100, 100, 500, 500)];
        const result = findNearestOpenSlot(200, 200, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes);
        expect(result.x).not.toBe(200);
        expect(Number.isFinite(result.x)).toBe(true);
    });

    it('falls back below all nodes when spiral exhausted', () => {
        const stepX = DEFAULT_NODE_WIDTH + GRID_GAP;
        const stepY = DEFAULT_NODE_HEIGHT + GRID_GAP;

        const nodes: CanvasNode[] = [];
        for (let ring = 0; ring <= MAX_SPIRAL_RINGS; ring++) {
            for (let dx = -ring; dx <= ring; dx++) {
                for (let dy = -ring; dy <= ring; dy++) {
                    nodes.push(makeNode(
                        `n-${dx}-${dy}`,
                        100 + dx * stepX,
                        100 + dy * stepY,
                    ));
                }
            }
        }

        const result = findNearestOpenSlot(100, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes);
        expect(result.x).toBe(100);

        let maxBottom = 0;
        for (const n of nodes) {
            const bottom = n.position.y + (n.height ?? DEFAULT_NODE_HEIGHT);
            if (bottom > maxBottom) maxBottom = bottom;
        }
        expect(result.y).toBe(maxBottom + GRID_GAP);
    });

    it('MAX_SPIRAL_RINGS is 10', () => {
        expect(MAX_SPIRAL_RINGS).toBe(10);
    });
});
