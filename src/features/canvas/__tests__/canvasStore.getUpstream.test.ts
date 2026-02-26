/**
 * Canvas Store getUpstreamNodes tests.
 * Split from canvasStore.test.ts to stay under 300 lines.
 */
/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import type { CanvasNode } from '../types/node';
import type { CanvasEdge } from '../types/edge';

const createNode = (id: string, prompt: string): CanvasNode => ({
    id,
    workspaceId: 'workspace-1',
    type: 'idea',
    data: { prompt, output: undefined, isGenerating: false, isPromptCollapsed: false },
    position: { x: 0, y: 0 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
});

const createEdge = (id: string, sourceId: string, targetId: string): CanvasEdge => ({
    id,
    workspaceId: 'workspace-1',
    sourceNodeId: sourceId,
    targetNodeId: targetId,
    relationshipType: 'related',
});

describe('CanvasStore getUpstreamNodes', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('should return empty array for node with no incoming edges', () => {
        const nodeA = createNode('node-A', 'Idea A');
        useCanvasStore.getState().addNode(nodeA);

        const upstream = useCanvasStore.getState().getUpstreamNodes('node-A');
        expect(upstream).toEqual([]);
    });

    it('should return direct parent for single edge (A -> B)', () => {
        const nodeA = createNode('node-A', 'New York');
        const nodeB = createNode('node-B', 'Cities');
        useCanvasStore.getState().addNode(nodeA);
        useCanvasStore.getState().addNode(nodeB);
        useCanvasStore.getState().addEdge(createEdge('edge-AB', 'node-A', 'node-B'));

        const upstream = useCanvasStore.getState().getUpstreamNodes('node-B');
        expect(upstream).toHaveLength(1);
        expect(upstream[0]?.id).toBe('node-A');
        expect(upstream[0]?.data.prompt).toBe('New York');
    });

    it('should return full chain A->B->C when called on C', () => {
        const nodeA = createNode('node-A', 'New York');
        const nodeB = createNode('node-B', 'Washington');
        const nodeC = createNode('node-C', 'US Cities');
        useCanvasStore.getState().addNode(nodeA);
        useCanvasStore.getState().addNode(nodeB);
        useCanvasStore.getState().addNode(nodeC);
        useCanvasStore.getState().addEdge(createEdge('edge-AB', 'node-A', 'node-B'));
        useCanvasStore.getState().addEdge(createEdge('edge-BC', 'node-B', 'node-C'));

        const upstream = useCanvasStore.getState().getUpstreamNodes('node-C');
        expect(upstream).toHaveLength(2);
        const upstreamIds = upstream.map(n => n.id);
        expect(upstreamIds).toContain('node-A');
        expect(upstreamIds).toContain('node-B');
    });

    it('should exclude unconnected nodes (London example)', () => {
        const nodeNY = createNode('node-NY', 'New York');
        const nodeLondon = createNode('node-London', 'London');
        const nodeWashington = createNode('node-Washington', 'Washington');
        const node4 = createNode('node-4', 'Generate here');

        useCanvasStore.getState().addNode(nodeNY);
        useCanvasStore.getState().addNode(nodeLondon);
        useCanvasStore.getState().addNode(nodeWashington);
        useCanvasStore.getState().addNode(node4);

        useCanvasStore.getState().addEdge(createEdge('edge-1', 'node-NY', 'node-Washington'));
        useCanvasStore.getState().addEdge(createEdge('edge-2', 'node-Washington', 'node-4'));

        const upstream = useCanvasStore.getState().getUpstreamNodes('node-4');
        const upstreamIds = upstream.map(n => n.id);

        expect(upstreamIds).toContain('node-NY');
        expect(upstreamIds).toContain('node-Washington');
        expect(upstreamIds).not.toContain('node-London');
        expect(upstream).toHaveLength(2);
    });

    it('should handle diamond dependencies (A->C, B->C both included)', () => {
        const nodeA = createNode('node-A', 'Idea A');
        const nodeB = createNode('node-B', 'Idea B');
        const nodeC = createNode('node-C', 'Combined');

        useCanvasStore.getState().addNode(nodeA);
        useCanvasStore.getState().addNode(nodeB);
        useCanvasStore.getState().addNode(nodeC);
        useCanvasStore.getState().addEdge(createEdge('edge-AC', 'node-A', 'node-C'));
        useCanvasStore.getState().addEdge(createEdge('edge-BC', 'node-B', 'node-C'));

        const upstream = useCanvasStore.getState().getUpstreamNodes('node-C');
        const upstreamIds = upstream.map(n => n.id);

        expect(upstream).toHaveLength(2);
        expect(upstreamIds).toContain('node-A');
        expect(upstreamIds).toContain('node-B');
    });

    it('should handle cycles without infinite loop', () => {
        const nodeA = createNode('node-A', 'Idea A');
        const nodeB = createNode('node-B', 'Idea B');
        const nodeC = createNode('node-C', 'Idea C');

        useCanvasStore.getState().addNode(nodeA);
        useCanvasStore.getState().addNode(nodeB);
        useCanvasStore.getState().addNode(nodeC);
        useCanvasStore.getState().addEdge(createEdge('edge-AB', 'node-A', 'node-B'));
        useCanvasStore.getState().addEdge(createEdge('edge-BC', 'node-B', 'node-C'));
        useCanvasStore.getState().addEdge(createEdge('edge-CA', 'node-C', 'node-A'));

        const upstream = useCanvasStore.getState().getUpstreamNodes('node-C');
        const upstreamIds = upstream.map(n => n.id);
        expect(upstreamIds).toContain('node-A');
        expect(upstreamIds).toContain('node-B');
    });

    it('should return nodes in BFS order (closest first)', () => {
        const nodeA = createNode('node-A', 'Grandparent');
        const nodeB = createNode('node-B', 'Parent');
        const nodeC = createNode('node-C', 'Child');

        useCanvasStore.getState().addNode(nodeA);
        useCanvasStore.getState().addNode(nodeB);
        useCanvasStore.getState().addNode(nodeC);
        useCanvasStore.getState().addEdge(createEdge('edge-AB', 'node-A', 'node-B'));
        useCanvasStore.getState().addEdge(createEdge('edge-BC', 'node-B', 'node-C'));

        const upstream = useCanvasStore.getState().getUpstreamNodes('node-C');

        expect(upstream[0]?.id).toBe('node-B');
        expect(upstream[1]?.id).toBe('node-A');
    });
});
