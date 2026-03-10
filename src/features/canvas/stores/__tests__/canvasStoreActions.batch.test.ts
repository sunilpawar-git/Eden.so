/**
 * canvasStoreActions — Batch action tests
 *
 * branchFromNode previously called addNode + addEdge as two separate set() calls,
 * causing two Zustand notification cycles. With 500 nodes, each cycle triggered
 * 500+ subscriber callbacks. Batching into addNodeAndEdge halves the cascade.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';
import type { CanvasEdge } from '../../types/edge';

function makeNode(id: string): CanvasNode {
    return {
        id, workspaceId: 'ws-1', type: 'idea',
        data: { heading: `Node ${id}` },
        position: { x: 0, y: 0 },
        createdAt: new Date(), updatedAt: new Date(),
    };
}

function makeEdge(id: string, source: string, target: string): CanvasEdge {
    return {
        id, workspaceId: 'ws-1',
        sourceNodeId: source, targetNodeId: target,
        relationshipType: 'related',
    };
}

describe('addNodeAndEdge (batched action)', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [makeNode('existing-1')],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('adds both node and edge in a single call', () => {
        const node = makeNode('new-1');
        const edge = makeEdge('edge-1', 'existing-1', 'new-1');
        useCanvasStore.getState().addNodeAndEdge(node, edge);

        const state = useCanvasStore.getState();
        expect(state.nodes).toHaveLength(2);
        expect(state.nodes[1]!.id).toBe('new-1');
        expect(state.edges).toHaveLength(1);
        expect(state.edges[0]!.id).toBe('edge-1');
    });

    it('fires exactly ONE Zustand notification', () => {
        let notifyCount = 0;
        const unsub = useCanvasStore.subscribe(() => { notifyCount++; });

        const node = makeNode('new-2');
        const edge = makeEdge('edge-2', 'existing-1', 'new-2');
        useCanvasStore.getState().addNodeAndEdge(node, edge);

        unsub();
        expect(notifyCount).toBe(1);
    });

    it('preserves existing nodes and edges', () => {
        useCanvasStore.setState({
            nodes: [makeNode('a'), makeNode('b')],
            edges: [makeEdge('e1', 'a', 'b')],
            selectedNodeIds: new Set(),
        });

        const node = makeNode('c');
        const edge = makeEdge('e2', 'b', 'c');
        useCanvasStore.getState().addNodeAndEdge(node, edge);

        const state = useCanvasStore.getState();
        expect(state.nodes).toHaveLength(3);
        expect(state.edges).toHaveLength(2);
        expect(state.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
        expect(state.edges.map((e) => e.id)).toEqual(['e1', 'e2']);
    });
});
