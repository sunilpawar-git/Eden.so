/**
 * Grid Layout Service — Branch Placement in Masonry Mode
 * TDD tests ensuring connected child nodes are placed adjacent to their
 * parent node (not at the globally shortest column) regardless of layout mode.
 *
 * calculateBranchPlacement is the universal branch placement function.
 * Previously masonry mode used calculateMasonryPosition which ignored
 * the source node entirely — this test suite prevents that regression.
 */
import { describe, it, expect } from 'vitest';
import { calculateBranchPlacement } from '../freeFlowPlacementService';
import type { CanvasNode } from '../../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';
import { GRID_GAP, GRID_PADDING } from '../gridConstants';

const STEP_X = DEFAULT_NODE_WIDTH + GRID_GAP;
const STEP_Y = DEFAULT_NODE_HEIGHT + GRID_GAP;

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
    data: { heading: '' },
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
} as CanvasNode);

describe('Branch placement — masonry mode regression guard', () => {
    it('places branch to the right of source node at same Y', () => {
        const source = makeNode('src', 100, 100);
        const result = calculateBranchPlacement(source, [source]);

        expect(result.x).toBe(100 + STEP_X);
        expect(result.y).toBe(100);
    });

    it('places branch near source even when shortest column is far away', () => {
        // Source is tall (h=800) in col 0. Col 3 is completely empty.
        // Old masonry bug: calculateMasonryPosition would place the child at
        // col 3 top (y=32) — visually disconnected from the source.
        // calculateBranchPlacement targets right-of-source, keeping the child
        // within the source's vertical span even after spiral collision avoidance.
        const source = makeNode('src', GRID_PADDING, GRID_PADDING, {
            height: 800,
            createdAt: new Date('2024-01-01'),
        });

        const branchResult = calculateBranchPlacement(source, [source]);

        // Branch should be placed at same Y as source
        expect(branchResult.y).toBe(source.position.y);
        // Branch should be right-adjacent
        expect(branchResult.x).toBe(
            source.position.x + (source.width ?? DEFAULT_NODE_WIDTH) + GRID_GAP,
        );
    });

    it('keeps branch in source vicinity when immediate right is blocked', () => {
        // Source at col 0 (h=800), n1 blocks the direct right slot, n2 blocks further right.
        // Spiral should still keep the branch within the source's vertical span.
        const source = makeNode('src', GRID_PADDING, GRID_PADDING, {
            height: 800,
            createdAt: new Date('2024-01-01'),
        });
        const n1 = makeNode('n1', GRID_PADDING + STEP_X, GRID_PADDING, {
            createdAt: new Date('2024-01-02'),
        });
        const n2 = makeNode('n2', GRID_PADDING + STEP_X * 2, GRID_PADDING, {
            createdAt: new Date('2024-01-03'),
        });

        const branchResult = calculateBranchPlacement(source, [source, n1, n2]);
        const sourceBottom = source.position.y + (source.height ?? DEFAULT_NODE_HEIGHT);

        // Branch Y should be within the source node's vertical span (y=32 to y=832)
        expect(branchResult.y).toBeGreaterThanOrEqual(source.position.y);
        expect(branchResult.y).toBeLessThanOrEqual(sourceBottom);

        // Branch should not collide with any existing node
        for (const node of [source, n1, n2]) {
            const overlapX = branchResult.x < node.position.x + (node.width ?? DEFAULT_NODE_WIDTH) &&
                branchResult.x + DEFAULT_NODE_WIDTH > node.position.x;
            const overlapY = branchResult.y < node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT) &&
                branchResult.y + DEFAULT_NODE_HEIGHT > node.position.y;
            expect(overlapX && overlapY).toBe(false);
        }
    });

    it('avoids collision when right side is occupied', () => {
        const source = makeNode('src', 100, 100);
        const blocking = makeNode('block', 100 + STEP_X, 100);

        const result = calculateBranchPlacement(source, [source, blocking]);

        // Should not collide with either node
        const collidesWithSource =
            result.x < 100 + DEFAULT_NODE_WIDTH && result.x + DEFAULT_NODE_WIDTH > 100 &&
            result.y < 100 + DEFAULT_NODE_HEIGHT && result.y + DEFAULT_NODE_HEIGHT > 100;
        const collidesWithBlocking =
            result.x < blocking.position.x + DEFAULT_NODE_WIDTH &&
            result.x + DEFAULT_NODE_WIDTH > blocking.position.x &&
            result.y < blocking.position.y + DEFAULT_NODE_HEIGHT &&
            result.y + DEFAULT_NODE_HEIGHT > blocking.position.y;

        expect(collidesWithSource).toBe(false);
        expect(collidesWithBlocking).toBe(false);
    });

    it('handles source at grid origin', () => {
        const source = makeNode('src', GRID_PADDING, GRID_PADDING);
        const result = calculateBranchPlacement(source, [source]);

        expect(result.x).toBe(GRID_PADDING + STEP_X);
        expect(result.y).toBe(GRID_PADDING);
    });

    it('respects source node custom width', () => {
        const wideWidth = 500;
        const source = makeNode('src', 100, 100, { width: wideWidth });
        const result = calculateBranchPlacement(source, [source]);

        expect(result.x).toBe(100 + wideWidth + GRID_GAP);
        expect(result.y).toBe(100);
    });

    it('works on canvas with just the source node', () => {
        const source = makeNode('src', GRID_PADDING, GRID_PADDING);
        const result = calculateBranchPlacement(source, [source]);

        expect(result.x).toBe(GRID_PADDING + STEP_X);
        expect(result.y).toBe(GRID_PADDING);
    });

    it('finds open slot among multiple blocking nodes', () => {
        const source = makeNode('src', 100, 100);
        const block1 = makeNode('b1', 100 + STEP_X, 100);
        const block2 = makeNode('b2', 100 + STEP_X, 100 + STEP_Y);
        const allNodes = [source, block1, block2];

        const result = calculateBranchPlacement(source, allNodes);

        // Should not collide with any existing node
        for (const node of allNodes) {
            const overlapX = result.x < node.position.x + (node.width ?? DEFAULT_NODE_WIDTH) &&
                result.x + DEFAULT_NODE_WIDTH > node.position.x;
            const overlapY = result.y < node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT) &&
                result.y + DEFAULT_NODE_HEIGHT > node.position.y;
            expect(overlapX && overlapY).toBe(false);
        }
    });

    it('resolves placement when right and below-right are blocked', () => {
        const source = makeNode('src', 100, 100);
        const rightBlocked = makeNode('r', 100 + STEP_X, 100);
        const diagBR = makeNode('br', 100 + STEP_X, 100 + STEP_Y);
        const below = makeNode('b', 100, 100 + STEP_Y);

        const result = calculateBranchPlacement(
            source, [source, rightBlocked, diagBR, below],
        );

        // Should find some non-colliding position (spiral resolves)
        for (const node of [source, rightBlocked, diagBR, below]) {
            const overlapX = result.x < node.position.x + DEFAULT_NODE_WIDTH &&
                result.x + DEFAULT_NODE_WIDTH > node.position.x;
            const overlapY = result.y < node.position.y + DEFAULT_NODE_HEIGHT &&
                result.y + DEFAULT_NODE_HEIGHT > node.position.y;
            expect(overlapX && overlapY).toBe(false);
        }
    });
});
