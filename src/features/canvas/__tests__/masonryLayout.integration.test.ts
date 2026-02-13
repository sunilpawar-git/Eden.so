/**
 * Masonry Layout Integration Tests
 * End-to-end tests for resize -> store update -> layout recalculation flow
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useNodeResize } from '../hooks/useNodeResize';
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import { GRID_PADDING, GRID_GAP } from '../services/gridLayoutService';

describe('Masonry Layout Integration', () => {
    const WORKSPACE_ID = 'test-workspace';

    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    describe('resize triggers incremental rearrange', () => {
        it('expandWidth triggers incremental rearrange and shifts neighbors', () => {
            // Setup: Two nodes side by side
            const node1 = createIdeaNode('n1', WORKSPACE_ID, { x: 32, y: 32 });
            const node2 = createIdeaNode('n2', WORKSPACE_ID, { x: 352, y: 32 });
            node1.createdAt = new Date('2024-01-01');
            node2.createdAt = new Date('2024-01-02');

            const store = useCanvasStore.getState();
            store.addNode(node1);
            store.addNode(node2);

            // Act: Expand n1's width
            const { result } = renderHook(() => useNodeResize('n1'));
            act(() => {
                result.current.expandWidth();
            });

            // Assert: n2 should be shifted right
            const updatedN2 = useCanvasStore.getState().nodes.find((n) => n.id === 'n2');
            // n1 width: 280 + 96 = 376, n2.x = 32 + 376 + 40 = 448
            expect(updatedN2?.position.x).toBe(448);
        });

        it('expandHeight triggers incremental rearrange', () => {
            // Setup: Two nodes in same column
            const node1 = createIdeaNode('n1', WORKSPACE_ID, { x: 32, y: 32 });
            const node2 = createIdeaNode('n2', WORKSPACE_ID, { x: 352, y: 32 });
            node1.createdAt = new Date('2024-01-01');
            node2.createdAt = new Date('2024-01-02');

            const store = useCanvasStore.getState();
            store.addNode(node1);
            store.addNode(node2);

            // Act: Expand n1's height
            const { result } = renderHook(() => useNodeResize('n1'));
            act(() => {
                result.current.expandHeight();
            });

            // Assert: n2 should remain in its position (different column)
            const updatedN2 = useCanvasStore.getState().nodes.find((n) => n.id === 'n2');
            expect(updatedN2?.position.y).toBe(GRID_PADDING);
        });
    });

    describe('full arrangeNodes produces consistent results', () => {
        it('full arrange produces same result as incremental for single change', () => {
            // Setup: Create nodes with wide n0
            const node0 = createIdeaNode('n0', WORKSPACE_ID, { x: 0, y: 0 });
            const node1 = createIdeaNode('n1', WORKSPACE_ID, { x: 0, y: 0 });
            node0.createdAt = new Date('2024-01-01');
            node1.createdAt = new Date('2024-01-02');
            node0.width = 472;

            const store = useCanvasStore.getState();
            store.addNode(node0);
            store.addNode(node1);

            // Full arrange
            store.arrangeNodes();
            const afterFull = useCanvasStore.getState().nodes.map((n) => ({
                id: n.id,
                x: n.position.x,
                y: n.position.y,
            }));

            // Reset and use incremental
            store.clearCanvas();
            store.addNode({ ...node0 });
            store.addNode({ ...node1 });
            store.arrangeAfterResize('n0');
            const afterIncremental = useCanvasStore.getState().nodes.map((n) => ({
                id: n.id,
                x: n.position.x,
                y: n.position.y,
            }));

            // Both should produce same positions
            expect(afterFull).toEqual(afterIncremental);
        });
    });

    describe('new node placement after resize', () => {
        it('adding a new node after resize places it correctly', () => {
            // Setup: 4 nodes filling all columns, n0 is wide
            const nodes = [
                { ...createIdeaNode('n0', WORKSPACE_ID, { x: 0, y: 0 }), width: 472, createdAt: new Date('2024-01-01') },
                { ...createIdeaNode('n1', WORKSPACE_ID, { x: 0, y: 0 }), createdAt: new Date('2024-01-02') },
                { ...createIdeaNode('n2', WORKSPACE_ID, { x: 0, y: 0 }), createdAt: new Date('2024-01-03') },
                { ...createIdeaNode('n3', WORKSPACE_ID, { x: 0, y: 0 }), createdAt: new Date('2024-01-04') },
            ];

            const store = useCanvasStore.getState();
            nodes.forEach((n) => store.addNode(n));
            store.arrangeNodes();

            // Add a new node
            const newNode = createIdeaNode('n4', WORKSPACE_ID, { x: 0, y: 0 });
            newNode.createdAt = new Date('2024-01-05');
            store.addNode(newNode);
            store.arrangeNodes();

            // n4 should go to col 0 (all same height after first pass)
            const placedN4 = useCanvasStore.getState().nodes.find((n) => n.id === 'n4');
            expect(placedN4?.position.x).toBe(GRID_PADDING);
            expect(placedN4?.position.y).toBe(GRID_PADDING + DEFAULT_NODE_HEIGHT + GRID_GAP);
        });
    });

    describe('neighbor-aware behavior verification', () => {
        it('wide node in row 2 does NOT affect row 1 neighbors', () => {
            // Setup: 5 nodes with n4 being wide in col 0 row 2
            const nodes = [
                { ...createIdeaNode('n0', WORKSPACE_ID, { x: 0, y: 0 }), createdAt: new Date('2024-01-01') },
                { ...createIdeaNode('n1', WORKSPACE_ID, { x: 0, y: 0 }), createdAt: new Date('2024-01-02') },
                { ...createIdeaNode('n2', WORKSPACE_ID, { x: 0, y: 0 }), createdAt: new Date('2024-01-03') },
                { ...createIdeaNode('n3', WORKSPACE_ID, { x: 0, y: 0 }), createdAt: new Date('2024-01-04') },
                { ...createIdeaNode('n4', WORKSPACE_ID, { x: 0, y: 0 }), width: 472, createdAt: new Date('2024-01-05') },
            ];

            const store = useCanvasStore.getState();
            nodes.forEach((n) => store.addNode(n));
            store.arrangeNodes();

            // n1 should NOT be shifted because n4 (wide) is at different Y
            const n1 = useCanvasStore.getState().nodes.find((n) => n.id === 'n1');
            expect(n1?.position.x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP);
        });
    });
});
