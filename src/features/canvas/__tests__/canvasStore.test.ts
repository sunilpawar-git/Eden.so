/**
 * Canvas Store Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import type { CanvasNode } from '../types/node';
import type { CanvasEdge } from '../types/edge';

const mockNode: CanvasNode = {
    id: 'node-1',
    workspaceId: 'workspace-1',
    type: 'prompt',
    data: { content: 'Test content' },
    position: { x: 100, y: 200 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const mockNode2: CanvasNode = {
    id: 'node-2',
    workspaceId: 'workspace-1',
    type: 'ai_output',
    data: { content: 'AI response' },
    position: { x: 300, y: 400 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const mockEdge: CanvasEdge = {
    id: 'edge-1',
    workspaceId: 'workspace-1',
    sourceNodeId: 'node-1',
    targetNodeId: 'node-2',
    relationshipType: 'related',
};

describe('CanvasStore', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    describe('initial state', () => {
        it('should start with empty nodes', () => {
            const state = useCanvasStore.getState();
            expect(state.nodes).toEqual([]);
        });

        it('should start with empty edges', () => {
            const state = useCanvasStore.getState();
            expect(state.edges).toEqual([]);
        });

        it('should start with no selected nodes', () => {
            const state = useCanvasStore.getState();
            expect(state.selectedNodeIds.size).toBe(0);
        });
    });

    describe('addNode', () => {
        it('should add a node to the canvas', () => {
            useCanvasStore.getState().addNode(mockNode);

            const state = useCanvasStore.getState();
            expect(state.nodes).toHaveLength(1);
            expect(state.nodes[0]).toEqual(mockNode);
        });

        it('should add multiple nodes', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().addNode(mockNode2);

            expect(useCanvasStore.getState().nodes).toHaveLength(2);
        });
    });

    describe('updateNodePosition', () => {
        it('should update node position', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodePosition('node-1', { x: 500, y: 600 });

            const node = useCanvasStore.getState().nodes[0];
            expect(node?.position).toEqual({ x: 500, y: 600 });
        });

        it('should not affect other nodes', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().addNode(mockNode2);
            useCanvasStore.getState().updateNodePosition('node-1', { x: 500, y: 600 });

            const node2 = useCanvasStore.getState().nodes[1];
            expect(node2?.position).toEqual({ x: 300, y: 400 });
        });
    });

    describe('updateNodeContent', () => {
        it('should update node content', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeContent('node-1', 'Updated content');

            const node = useCanvasStore.getState().nodes[0];
            expect(node?.data.content).toBe('Updated content');
        });
    });

    describe('deleteNode', () => {
        it('should remove node from canvas', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().deleteNode('node-1');

            expect(useCanvasStore.getState().nodes).toHaveLength(0);
        });

        it('should also remove edges connected to deleted node', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().addNode(mockNode2);
            useCanvasStore.getState().addEdge(mockEdge);
            useCanvasStore.getState().deleteNode('node-1');

            expect(useCanvasStore.getState().edges).toHaveLength(0);
        });
    });

    describe('addEdge', () => {
        it('should add an edge between nodes', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().addNode(mockNode2);
            useCanvasStore.getState().addEdge(mockEdge);

            const state = useCanvasStore.getState();
            expect(state.edges).toHaveLength(1);
            expect(state.edges[0]).toEqual(mockEdge);
        });
    });

    describe('deleteEdge', () => {
        it('should remove edge from canvas', () => {
            useCanvasStore.getState().addEdge(mockEdge);
            useCanvasStore.getState().deleteEdge('edge-1');

            expect(useCanvasStore.getState().edges).toHaveLength(0);
        });
    });

    describe('selectNode', () => {
        it('should add node to selection', () => {
            useCanvasStore.getState().selectNode('node-1');

            expect(useCanvasStore.getState().selectedNodeIds.has('node-1')).toBe(true);
        });

        it('should support multi-select', () => {
            useCanvasStore.getState().selectNode('node-1');
            useCanvasStore.getState().selectNode('node-2');

            const selected = useCanvasStore.getState().selectedNodeIds;
            expect(selected.size).toBe(2);
        });
    });

    describe('deselectNode', () => {
        it('should remove node from selection', () => {
            useCanvasStore.getState().selectNode('node-1');
            useCanvasStore.getState().deselectNode('node-1');

            expect(useCanvasStore.getState().selectedNodeIds.has('node-1')).toBe(false);
        });
    });

    describe('clearSelection', () => {
        it('should clear all selected nodes', () => {
            useCanvasStore.getState().selectNode('node-1');
            useCanvasStore.getState().selectNode('node-2');
            useCanvasStore.getState().clearSelection();

            expect(useCanvasStore.getState().selectedNodeIds.size).toBe(0);
        });
    });

    describe('getConnectedNodes', () => {
        it('should return nodes connected to a given node', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().addNode(mockNode2);
            useCanvasStore.getState().addEdge(mockEdge);

            const connected = useCanvasStore.getState().getConnectedNodes('node-1');
            expect(connected).toContain('node-2');
        });
    });
});
