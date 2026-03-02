/**
 * Canvas Store Node Pool Tests — toggleNodePoolMembership & clearAllNodePool
 * TDD: tests written before implementation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';

function createTestNode(id: string, overrides: Partial<CanvasNode['data']> = {}): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        data: { heading: `Node ${id}`, output: 'content', ...overrides },
        position: { x: 0, y: 0 },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };
}

describe('canvasStore — Node Pool actions', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [
                createTestNode('node-1'),
                createTestNode('node-2', { includeInAIPool: true }),
                createTestNode('node-3', { includeInAIPool: false }),
            ],
            edges: [],
            selectedNodeIds: new Set(),
            editingNodeId: null,
            draftContent: null,
            inputMode: 'note',
        });
    });

    describe('toggleNodePoolMembership', () => {
        it('sets includeInAIPool to true on a node with undefined pool state', () => {
            useCanvasStore.getState().toggleNodePoolMembership('node-1');
            const node = useCanvasStore.getState().nodes.find((n) => n.id === 'node-1');
            expect(node?.data.includeInAIPool).toBe(true);
        });

        it('sets includeInAIPool to false on a pooled node', () => {
            useCanvasStore.getState().toggleNodePoolMembership('node-2');
            const node = useCanvasStore.getState().nodes.find((n) => n.id === 'node-2');
            expect(node?.data.includeInAIPool).toBe(false);
        });

        it('sets includeInAIPool to true on an explicitly non-pooled node', () => {
            useCanvasStore.getState().toggleNodePoolMembership('node-3');
            const node = useCanvasStore.getState().nodes.find((n) => n.id === 'node-3');
            expect(node?.data.includeInAIPool).toBe(true);
        });

        it('does not mutate other nodes', () => {
            useCanvasStore.getState().toggleNodePoolMembership('node-1');
            const node2 = useCanvasStore.getState().nodes.find((n) => n.id === 'node-2');
            const node3 = useCanvasStore.getState().nodes.find((n) => n.id === 'node-3');
            expect(node2?.data.includeInAIPool).toBe(true);
            expect(node3?.data.includeInAIPool).toBe(false);
        });

        it('updates updatedAt timestamp', () => {
            const before = useCanvasStore.getState().nodes.find((n) => n.id === 'node-1')!.updatedAt;
            useCanvasStore.getState().toggleNodePoolMembership('node-1');
            const after = useCanvasStore.getState().nodes.find((n) => n.id === 'node-1')!.updatedAt;
            expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });

        it('is a no-op for non-existent nodeId', () => {
            const nodesBefore = useCanvasStore.getState().nodes;
            useCanvasStore.getState().toggleNodePoolMembership('nonexistent');
            const nodesAfter = useCanvasStore.getState().nodes;
            expect(nodesAfter).toEqual(nodesBefore);
        });
    });

    describe('clearAllNodePool', () => {
        it('sets includeInAIPool to false on all pooled nodes', () => {
            useCanvasStore.getState().clearAllNodePool();
            const nodes = useCanvasStore.getState().nodes;
            expect(nodes.every((n) => !n.data.includeInAIPool)).toBe(true);
        });

        it('does not mutate nodes that were already not in the pool', () => {
            const node1Before = useCanvasStore.getState().nodes.find((n) => n.id === 'node-1')!;
            useCanvasStore.getState().clearAllNodePool();
            const node1After = useCanvasStore.getState().nodes.find((n) => n.id === 'node-1')!;
            expect(node1After.updatedAt).toEqual(node1Before.updatedAt);
        });

        it('updates updatedAt only on nodes that were pooled', () => {
            const node2Before = useCanvasStore.getState().nodes.find((n) => n.id === 'node-2')!;
            useCanvasStore.getState().clearAllNodePool();
            const node2After = useCanvasStore.getState().nodes.find((n) => n.id === 'node-2')!;
            expect(node2After.updatedAt.getTime()).toBeGreaterThanOrEqual(node2Before.updatedAt.getTime());
        });
    });
});
