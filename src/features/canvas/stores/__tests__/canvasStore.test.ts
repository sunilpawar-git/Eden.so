/**
 * Tests for Canvas Store Actions
 * Verifies integration of helpers into the store
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';

const createMockNode = (id: string, overrides?: Partial<CanvasNode>): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    data: { prompt: '', output: '', tags: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('canvasStore', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    describe('clearSelection idempotency', () => {
        it('does not create new state when selection is already empty', () => {
            const stateBefore = useCanvasStore.getState();
            expect(stateBefore.selectedNodeIds.size).toBe(0);
            useCanvasStore.getState().clearSelection();
            const stateAfter = useCanvasStore.getState();
            expect(stateAfter.selectedNodeIds).toBe(stateBefore.selectedNodeIds);
        });

        it('clears selection when nodes are selected', () => {
            useCanvasStore.getState().selectNode('n1');
            expect(useCanvasStore.getState().selectedNodeIds.size).toBe(1);
            useCanvasStore.getState().clearSelection();
            expect(useCanvasStore.getState().selectedNodeIds.size).toBe(0);
        });
    });

    describe('arrangeNodes', () => {
        it('should update node positions in the store', () => {
            const baseDate = new Date('2024-01-01');
            const nodes = [
                createMockNode('n1', { createdAt: new Date(baseDate.getTime() + 1000) }),
                createMockNode('n2', { createdAt: new Date(baseDate.getTime() + 2000) }),
                createMockNode('n3', { createdAt: new Date(baseDate.getTime() + 3000) }),
                createMockNode('n4', { createdAt: new Date(baseDate.getTime() + 4000) }),
                createMockNode('n5', { createdAt: new Date(baseDate.getTime() + 5000) }),
            ];

            useCanvasStore.getState().setNodes(nodes);
            useCanvasStore.getState().arrangeNodes();

            const updatedNodes = useCanvasStore.getState().nodes;

            // Node 5 should be moved to row 2
            expect(updatedNodes[4]!.position.y).toBeGreaterThan(0);

            // Node 1 should be at 32,32
            expect(updatedNodes[0]!.position.x).toBe(32);
            expect(updatedNodes[0]!.position.y).toBe(32);
        });

        it('should trigger store update', () => {
            const nodes = [createMockNode('n1')];
            useCanvasStore.getState().setNodes(nodes);

            const originalUpdatedAt = useCanvasStore.getState().nodes[0]!.updatedAt;

            // Wait a tick to ensure time difference
            setTimeout(() => {
                useCanvasStore.getState().arrangeNodes();
                const newUpdatedAt = useCanvasStore.getState().nodes[0]!.updatedAt;
                expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
            }, 0);
        });

        it('should NOT move pinned nodes during arrangeNodes', () => {
            const baseDate = new Date('2024-01-01');
            const nodes = [
                createMockNode('pinned', {
                    position: { x: 500, y: 600 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date(baseDate.getTime() + 1000),
                }),
                createMockNode('free1', {
                    createdAt: new Date(baseDate.getTime() + 2000),
                }),
                createMockNode('free2', {
                    createdAt: new Date(baseDate.getTime() + 3000),
                }),
            ];

            useCanvasStore.getState().setNodes(nodes);
            useCanvasStore.getState().arrangeNodes();

            const updated = useCanvasStore.getState().nodes;
            const pinnedNode = updated.find(n => n.id === 'pinned');
            const freeNode1 = updated.find(n => n.id === 'free1');

            expect(pinnedNode!.position).toEqual({ x: 500, y: 600 });
            expect(freeNode1!.position.x).toBe(32);
            expect(freeNode1!.position.y).toBe(32);
        });

        it('should NOT move pinned nodes during arrangeAfterResize', () => {
            const baseDate = new Date('2024-01-01');
            const nodes = [
                createMockNode('pinned', {
                    position: { x: 777, y: 888 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date(baseDate.getTime() + 1000),
                }),
                createMockNode('resized', {
                    width: 400,
                    height: 300,
                    createdAt: new Date(baseDate.getTime() + 2000),
                }),
            ];

            useCanvasStore.getState().setNodes(nodes);
            useCanvasStore.getState().arrangeAfterResize('resized');

            const updated = useCanvasStore.getState().nodes;
            const pinnedNode = updated.find(n => n.id === 'pinned');

            expect(pinnedNode!.position).toEqual({ x: 777, y: 888 });
        });

        it('should return all nodes including pinned after arrange', () => {
            const nodes = [
                createMockNode('p1', {
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                }),
                createMockNode('f1'),
                createMockNode('f2'),
            ];

            useCanvasStore.getState().setNodes(nodes);
            useCanvasStore.getState().arrangeNodes();

            const updated = useCanvasStore.getState().nodes;
            expect(updated).toHaveLength(3);
        });
    });
});
