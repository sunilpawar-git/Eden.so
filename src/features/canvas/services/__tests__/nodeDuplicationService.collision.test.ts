/**
 * Node Duplication Service — Collision Avoidance Tests (TDD)
 * Ensures duplicate nodes avoid overlapping existing nodes
 * by using spiral search when the right-side slot is occupied.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { duplicateNode } from '../nodeDuplicationService';
import type { CanvasNode } from '../../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';
import { GRID_GAP } from '../gridConstants';

const STEP_X = DEFAULT_NODE_WIDTH + GRID_GAP;

const makeNode = (
    id: string,
    x: number,
    y: number,
    overrides?: Partial<CanvasNode>,
): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x, y },
    data: { heading: 'Test', output: '', tags: [] },
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
} as CanvasNode);

describe('duplicateNode — collision avoidance', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('places duplicate to the right when no collision', () => {
        const source = makeNode('src', 100, 200, { width: 280 });
        const result = duplicateNode(source, [source]);

        expect(result.position).toEqual({
            x: 100 + 280 + GRID_GAP,
            y: 200,
        });
    });

    it('avoids collision when a node already occupies the right side', () => {
        const source = makeNode('src', 100, 100);
        const rightNeighbor = makeNode('right', 100 + STEP_X, 100);
        const allNodes = [source, rightNeighbor];

        const result = duplicateNode(source, allNodes);

        // Should not overlap with the right neighbor
        const overlapX =
            result.position.x < rightNeighbor.position.x + DEFAULT_NODE_WIDTH &&
            result.position.x + DEFAULT_NODE_WIDTH > rightNeighbor.position.x;
        const overlapY =
            result.position.y < rightNeighbor.position.y + DEFAULT_NODE_HEIGHT &&
            result.position.y + DEFAULT_NODE_HEIGHT > rightNeighbor.position.y;

        expect(overlapX && overlapY).toBe(false);
    });

    it('avoids collision with the source node itself', () => {
        const source = makeNode('src', 100, 100);
        const rightNeighbor = makeNode('right', 100 + STEP_X, 100);

        const result = duplicateNode(source, [source, rightNeighbor]);

        // Should not overlap with source
        const overlapX =
            result.position.x < source.position.x + DEFAULT_NODE_WIDTH &&
            result.position.x + DEFAULT_NODE_WIDTH > source.position.x;
        const overlapY =
            result.position.y < source.position.y + DEFAULT_NODE_HEIGHT &&
            result.position.y + DEFAULT_NODE_HEIGHT > source.position.y;

        expect(overlapX && overlapY).toBe(false);
    });

    it('finds open slot among multiple blocking neighbors', () => {
        const source = makeNode('src', 100, 100);
        const block1 = makeNode('b1', 100 + STEP_X, 100);
        const block2 = makeNode('b2', 100 + STEP_X * 2, 100);
        const allNodes = [source, block1, block2];

        const result = duplicateNode(source, allNodes);

        for (const node of allNodes) {
            const overlapX =
                result.position.x < node.position.x + (node.width ?? DEFAULT_NODE_WIDTH) &&
                result.position.x + DEFAULT_NODE_WIDTH > node.position.x;
            const overlapY =
                result.position.y < node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT) &&
                result.position.y + DEFAULT_NODE_HEIGHT > node.position.y;
            expect(overlapX && overlapY).toBe(false);
        }
    });

    it('handles a dense grid without overlap', () => {
        const source = makeNode('src', 100, 100);
        const stepY = DEFAULT_NODE_HEIGHT + GRID_GAP;
        const neighbors = [
            makeNode('r1', 100 + STEP_X, 100),
            makeNode('r2', 100 + STEP_X, 100 + stepY),
            makeNode('b1', 100, 100 + stepY),
        ];
        const allNodes = [source, ...neighbors];

        const result = duplicateNode(source, allNodes);

        for (const node of allNodes) {
            const overlapX =
                result.position.x < node.position.x + (node.width ?? DEFAULT_NODE_WIDTH) &&
                result.position.x + DEFAULT_NODE_WIDTH > node.position.x;
            const overlapY =
                result.position.y < node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT) &&
                result.position.y + DEFAULT_NODE_HEIGHT > node.position.y;
            expect(overlapX && overlapY).toBe(false);
        }
    });
});
