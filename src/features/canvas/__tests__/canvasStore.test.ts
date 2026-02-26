/**
 * Canvas Store Tests - TDD: Write tests FIRST
 * Note: IdeaNode-specific tests are in ideaNodeActions.test.ts
 */
/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import type { CanvasNode } from '../types/node';
import type { CanvasEdge } from '../types/edge';

const mockNode: CanvasNode = {
    id: 'node-1',
    workspaceId: 'workspace-1',
    type: 'idea',
    data: { prompt: 'Test content', output: undefined, isGenerating: false, isPromptCollapsed: false },
    position: { x: 100, y: 200 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const mockNode2: CanvasNode = {
    id: 'node-2',
    workspaceId: 'workspace-1',
    type: 'idea',
    data: { prompt: 'AI response', output: undefined, isGenerating: false, isPromptCollapsed: false },
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

    describe('updateNodeDimensions', () => {
        it('should update node dimensions within bounds', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('node-1', 400, 300);

            const node = useCanvasStore.getState().nodes[0];
            expect(node?.width).toBe(400);
            expect(node?.height).toBe(300);
        });

        it('should clamp dimensions below minimum', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('node-1', 50, 30);

            const node = useCanvasStore.getState().nodes[0];
            // MIN_NODE_WIDTH = 180, MIN_NODE_HEIGHT = 100
            expect(node?.width).toBe(180);
            expect(node?.height).toBe(100);
        });

        it('should clamp dimensions above maximum', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('node-1', 1500, 1200);

            const node = useCanvasStore.getState().nodes[0];
            // MAX_NODE_WIDTH = 900, MAX_NODE_HEIGHT = 800
            expect(node?.width).toBe(900);
            expect(node?.height).toBe(800);
        });

        it('should update updatedAt timestamp', () => {
            useCanvasStore.getState().addNode(mockNode);
            const beforeUpdate = new Date();
            useCanvasStore.getState().updateNodeDimensions('node-1', 400, 300);
            const afterUpdate = new Date();

            const node = useCanvasStore.getState().nodes[0];
            expect(node?.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
            expect(node?.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
        });

        it('should not affect other nodes', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().addNode(mockNode2);
            useCanvasStore.getState().updateNodeDimensions('node-1', 400, 300);

            const node2 = useCanvasStore.getState().nodes[1];
            expect(node2?.width).toBeUndefined();
            expect(node2?.height).toBeUndefined();
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

        it('should not affect other edges when deleting one', () => {
            const edge2: CanvasEdge = { ...mockEdge, id: 'edge-2', sourceNodeId: 'node-2', targetNodeId: 'node-1' };
            useCanvasStore.getState().addEdge(mockEdge);
            useCanvasStore.getState().addEdge(edge2);
            useCanvasStore.getState().deleteEdge('edge-1');

            const edges = useCanvasStore.getState().edges;
            expect(edges).toHaveLength(1);
            expect(edges[0]?.id).toBe('edge-2');
        });

        it('should no-op for non-existent edge ID', () => {
            useCanvasStore.getState().addEdge(mockEdge);
            useCanvasStore.getState().deleteEdge('nonexistent');

            expect(useCanvasStore.getState().edges).toHaveLength(1);
            expect(useCanvasStore.getState().edges[0]?.id).toBe('edge-1');
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
