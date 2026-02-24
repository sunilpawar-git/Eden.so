/**
 * Free Flow Placement Integration Tests
 * End-to-end tests verifying stores, hooks, and placement logic work together
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useNodeResize } from '../hooks/useNodeResize';
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import { GRID_GAP } from '../services/gridLayoutService';
import { calculateSmartPlacement, calculateBranchPlacement } from '../services/freeFlowPlacementService';
import { calculateNextNodePosition } from '../stores/canvasStoreHelpers';

const WORKSPACE_ID = 'test-workspace';

describe('Free Flow Placement Integration', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
        useSettingsStore.setState({ canvasFreeFlow: false });
    });

    describe('add node with free-flow ON', () => {
        it('should place new node to the right of latest, not in masonry grid', () => {
            const node1 = createIdeaNode('n1', WORKSPACE_ID, { x: 100, y: 100 });
            node1.createdAt = new Date('2024-01-01');
            useCanvasStore.getState().addNode(node1);

            useSettingsStore.setState({ canvasFreeFlow: true });

            const freshNodes = useCanvasStore.getState().nodes;
            const position = calculateSmartPlacement(freshNodes);

            expect(position.x).toBe(100 + DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(position.y).toBe(100);
        });
    });

    describe('branch from node with free-flow ON', () => {
        it('should place child node to the right of parent', () => {
            const parent = createIdeaNode('parent', WORKSPACE_ID, { x: 50, y: 50 });
            useCanvasStore.getState().addNode(parent);

            useSettingsStore.setState({ canvasFreeFlow: true });

            const freshNodes = useCanvasStore.getState().nodes;
            const position = calculateBranchPlacement(parent, freshNodes);

            expect(position.x).toBe(50 + DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(position.y).toBe(50);
        });
    });

    describe('multiple branches stack vertically', () => {
        it('should stack 3 children without overlaps', () => {
            const parent = createIdeaNode('parent', WORKSPACE_ID, { x: 50, y: 50 });
            useCanvasStore.getState().addNode(parent);

            useSettingsStore.setState({ canvasFreeFlow: true });

            const branchX = 50 + DEFAULT_NODE_WIDTH + GRID_GAP;
            const child1 = createIdeaNode('c1', WORKSPACE_ID, { x: branchX, y: 50 });
            useCanvasStore.getState().addNode(child1);

            const child2 = createIdeaNode('c2', WORKSPACE_ID, {
                x: branchX,
                y: 50 + DEFAULT_NODE_HEIGHT + GRID_GAP,
            });
            useCanvasStore.getState().addNode(child2);

            const freshNodes = useCanvasStore.getState().nodes;
            const position = calculateBranchPlacement(parent, freshNodes);

            const expectedY = 50 + 2 * (DEFAULT_NODE_HEIGHT + GRID_GAP);
            expect(position.x).toBe(branchX);
            expect(position.y).toBe(expectedY);
        });
    });

    describe('resize with free-flow ON', () => {
        it('should NOT rearrange neighbors when free-flow is enabled', () => {
            const node1 = createIdeaNode('n1', WORKSPACE_ID, { x: 32, y: 32 });
            const node2 = createIdeaNode('n2', WORKSPACE_ID, { x: 352, y: 32 });
            node1.createdAt = new Date('2024-01-01');
            node2.createdAt = new Date('2024-01-02');

            const store = useCanvasStore.getState();
            store.addNode(node1);
            store.addNode(node2);

            useSettingsStore.setState({ canvasFreeFlow: true });

            const originalN2Pos = { ...node2.position };

            const { result } = renderHook(() => useNodeResize('n1'));
            act(() => {
                result.current.expandWidth();
            });

            const updatedN2 = useCanvasStore.getState().nodes.find((n) => n.id === 'n2');
            expect(updatedN2?.position.x).toBe(originalN2Pos.x);
            expect(updatedN2?.position.y).toBe(originalN2Pos.y);
        });

        it('should still resize the node dimensions', () => {
            const node1 = createIdeaNode('n1', WORKSPACE_ID, { x: 32, y: 32 });
            useCanvasStore.getState().addNode(node1);

            useSettingsStore.setState({ canvasFreeFlow: true });

            const { result } = renderHook(() => useNodeResize('n1'));
            act(() => {
                result.current.expandWidth();
            });

            const updated = useCanvasStore.getState().nodes.find((n) => n.id === 'n1');
            expect(updated?.width).toBe(DEFAULT_NODE_WIDTH + 96);
        });
    });

    describe('toggle free-flow OFF restores masonry behavior', () => {
        it('should use masonry algorithm after toggling free-flow OFF', () => {
            useSettingsStore.setState({ canvasFreeFlow: true });

            const node1 = createIdeaNode('n1', WORKSPACE_ID, { x: 100, y: 100 });
            useCanvasStore.getState().addNode(node1);

            useSettingsStore.setState({ canvasFreeFlow: false });

            const freshNodes = useCanvasStore.getState().nodes;
            const masonryPos = calculateNextNodePosition(freshNodes);

            expect(masonryPos.x).not.toBe(100 + DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(masonryPos).toEqual({ x: expect.any(Number), y: expect.any(Number) });
        });
    });
});
