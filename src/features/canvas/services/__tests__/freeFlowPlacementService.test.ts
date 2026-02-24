/**
 * Free Flow Placement Service Tests (TDD-first)
 * Tests pure placement functions for free-flow node positioning
 */
import { describe, it, expect } from 'vitest';
import {
    calculateSmartPlacement,
    calculateBranchPlacement,
} from '../freeFlowPlacementService';
import type { CanvasNode } from '../../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';
import { GRID_GAP, GRID_PADDING } from '../gridLayoutService';

const createMockNode = (
    id: string,
    x: number,
    y: number,
    overrides?: Partial<CanvasNode>
): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x, y },
    data: { prompt: '', output: '', tags: [] },
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
});

describe('freeFlowPlacementService', () => {
    describe('calculateSmartPlacement', () => {
        it('should place first node at grid padding origin', () => {
            const position = calculateSmartPlacement([]);
            expect(position).toEqual({ x: GRID_PADDING, y: GRID_PADDING });
        });

        it('should place new node to the right of the latest node', () => {
            const nodes = [createMockNode('n1', 32, 32)];
            const position = calculateSmartPlacement(nodes);
            expect(position.x).toBe(32 + DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(position.y).toBe(32);
        });

        it('should place beside the focused node when focusedNodeId is provided', () => {
            const nodes = [
                createMockNode('n1', 32, 32),
                createMockNode('n2', 800, 800),
            ];
            const position = calculateSmartPlacement(nodes, 'n1');
            expect(position.x).toBe(32 + DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(position.y).toBe(32);
        });

        it('should avoid collision with existing node at target position', () => {
            const targetX = 32 + DEFAULT_NODE_WIDTH + GRID_GAP;
            const nodes = [
                createMockNode('n1', 32, 32),
                createMockNode('n2', targetX, 32),
            ];
            const position = calculateSmartPlacement(nodes);
            expect(position.x).toBe(targetX);
            expect(position.y).toBe(32 + DEFAULT_NODE_HEIGHT + GRID_GAP);
        });

        it('should stack below multiple collisions', () => {
            const targetX = 32 + DEFAULT_NODE_WIDTH + GRID_GAP;
            const nodes = [
                createMockNode('n1', 32, 32),
                createMockNode('n2', targetX, 32),
                createMockNode('n3', targetX, 32 + DEFAULT_NODE_HEIGHT + GRID_GAP),
            ];
            const position = calculateSmartPlacement(nodes);
            const expectedY = 32 + 2 * (DEFAULT_NODE_HEIGHT + GRID_GAP);
            expect(position.x).toBe(targetX);
            expect(position.y).toBe(expectedY);
        });

        it('should use latest node by createdAt when no focusedNodeId', () => {
            const nodes = [
                createMockNode('n1', 32, 32, { createdAt: new Date('2024-01-01') }),
                createMockNode('n2', 500, 100, { createdAt: new Date('2024-01-02') }),
            ];
            const position = calculateSmartPlacement(nodes);
            expect(position.x).toBe(500 + DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(position.y).toBe(100);
        });

        it('should respect custom node widths for offset calculation', () => {
            const wideWidth = 500;
            const nodes = [
                createMockNode('n1', 32, 32, { width: wideWidth }),
            ];
            const position = calculateSmartPlacement(nodes);
            expect(position.x).toBe(32 + wideWidth + GRID_GAP);
            expect(position.y).toBe(32);
        });
    });

    describe('calculateBranchPlacement', () => {
        it('should place branch to the right of the source node', () => {
            const source = createMockNode('src', 100, 100);
            const position = calculateBranchPlacement(source, [source]);
            expect(position.x).toBe(100 + DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(position.y).toBe(100);
        });

        it('should stack vertically when sibling already exists at branch position', () => {
            const source = createMockNode('src', 100, 100);
            const branchX = 100 + DEFAULT_NODE_WIDTH + GRID_GAP;
            const sibling = createMockNode('sib', branchX, 100);
            const position = calculateBranchPlacement(source, [source, sibling]);
            expect(position.x).toBe(branchX);
            expect(position.y).toBe(100 + DEFAULT_NODE_HEIGHT + GRID_GAP);
        });

        it('should stack below multiple siblings', () => {
            const source = createMockNode('src', 100, 100);
            const branchX = 100 + DEFAULT_NODE_WIDTH + GRID_GAP;
            const sib1 = createMockNode('sib1', branchX, 100);
            const sib2 = createMockNode('sib2', branchX, 100 + DEFAULT_NODE_HEIGHT + GRID_GAP);
            const position = calculateBranchPlacement(source, [source, sib1, sib2]);
            const expectedY = 100 + 2 * (DEFAULT_NODE_HEIGHT + GRID_GAP);
            expect(position.x).toBe(branchX);
            expect(position.y).toBe(expectedY);
        });

        it('should respect source node custom width', () => {
            const wideWidth = 600;
            const source = createMockNode('src', 100, 100, { width: wideWidth });
            const position = calculateBranchPlacement(source, [source]);
            expect(position.x).toBe(100 + wideWidth + GRID_GAP);
            expect(position.y).toBe(100);
        });

        it('should handle source at origin', () => {
            const source = createMockNode('src', 0, 0);
            const position = calculateBranchPlacement(source, [source]);
            expect(position.x).toBe(DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(position.y).toBe(0);
        });
    });
});
