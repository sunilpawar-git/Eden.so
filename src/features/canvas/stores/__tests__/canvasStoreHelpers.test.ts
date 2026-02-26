/**
 * Tests for Canvas Store Helpers
 * TDD: Write tests FIRST before refactoring canvasStore.ts
 */
/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, it, expect } from 'vitest';
import {
    updateNodePositionInArray,
    updateNodeDimensionsInArray,
    updateNodeDataField,
    appendToNodeOutputInArray,
    togglePromptCollapsedInArray,
    deleteNodeFromArrays,
    getConnectedNodeIds,
    getUpstreamNodesFromArrays,
    arrangeNodesAfterResize,
    setNodeColorInArray,
} from '../canvasStoreHelpers';
import type { CanvasNode } from '../../types/node';
import type { CanvasEdge } from '../../types/edge';

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

const createMockEdge = (id: string, source: string, target: string): CanvasEdge => ({
    id,
    workspaceId: 'ws-1',
    sourceNodeId: source,
    targetNodeId: target,
    relationshipType: 'related',
});

describe('canvasStoreHelpers', () => {
    describe('updateNodePositionInArray', () => {
        it('should update position of matching node', () => {
            const nodes = [createMockNode('n1'), createMockNode('n2')];
            const result = updateNodePositionInArray(nodes, 'n1', { x: 100, y: 200 });

            expect(result[0]!.position).toEqual({ x: 100, y: 200 });
            expect(result[1]!.position).toEqual({ x: 0, y: 0 });
        });

        it('should not mutate original array', () => {
            const nodes = [createMockNode('n1')];
            const result = updateNodePositionInArray(nodes, 'n1', { x: 100, y: 200 });

            expect(result).not.toBe(nodes);
            expect(nodes[0]!.position).toEqual({ x: 0, y: 0 });
        });
    });

    describe('updateNodeDimensionsInArray', () => {
        it('should update dimensions with clamping', () => {
            const nodes = [createMockNode('n1')];
            const result = updateNodeDimensionsInArray(nodes, 'n1', 300, 200);

            expect(result[0]!.width).toBe(300);
            expect(result[0]!.height).toBe(200);
        });

        it('should clamp dimensions to min/max bounds', () => {
            const nodes = [createMockNode('n1')];
            const result = updateNodeDimensionsInArray(nodes, 'n1', 50, 30);

            // Should be clamped to minimum values
            expect(result[0]!.width).toBeGreaterThanOrEqual(100);
            expect(result[0]!.height).toBeGreaterThanOrEqual(60);
        });
    });

    describe('updateNodeDataField', () => {
        it('should update prompt field', () => {
            const nodes = [createMockNode('n1')];
            const result = updateNodeDataField(nodes, 'n1', 'prompt', 'new prompt');

            expect(result[0]!.data.prompt).toBe('new prompt');
        });

        it('should update output field', () => {
            const nodes = [createMockNode('n1')];
            const result = updateNodeDataField(nodes, 'n1', 'output', 'new output');

            expect(result[0]!.data.output).toBe('new output');
        });

        it('should update tags field', () => {
            const nodes = [createMockNode('n1')];
            const result = updateNodeDataField(nodes, 'n1', 'tags', ['tag1', 'tag2']);

            expect(result[0]!.data.tags).toEqual(['tag1', 'tag2']);
        });
    });

    describe('appendToNodeOutputInArray', () => {
        it('should append chunk to existing output', () => {
            const nodes = [createMockNode('n1', { data: { prompt: '', output: 'Hello', tags: [] } })];
            const result = appendToNodeOutputInArray(nodes, 'n1', ' World');

            expect(result[0]!.data.output).toBe('Hello World');
        });

        it('should handle undefined output', () => {
            const nodes = [createMockNode('n1', { data: { prompt: '', output: undefined, tags: [] } })];
            const result = appendToNodeOutputInArray(nodes, 'n1', 'First');

            expect(result[0]!.data.output).toBe('First');
        });
    });

    describe('togglePromptCollapsedInArray', () => {
        it('should toggle from false to true', () => {
            const nodes = [createMockNode('n1', { data: { prompt: '', output: '', tags: [], isPromptCollapsed: false } })];
            const result = togglePromptCollapsedInArray(nodes, 'n1');

            expect(result[0]!.data.isPromptCollapsed).toBe(true);
        });

        it('should toggle from true to false', () => {
            const nodes = [createMockNode('n1', { data: { prompt: '', output: '', tags: [], isPromptCollapsed: true } })];
            const result = togglePromptCollapsedInArray(nodes, 'n1');

            expect(result[0]!.data.isPromptCollapsed).toBe(false);
        });
    });

    describe('deleteNodeFromArrays', () => {
        it('should remove node from nodes array', () => {
            const nodes = [createMockNode('n1'), createMockNode('n2')];
            const edges: CanvasEdge[] = [];
            const selectedNodeIds = new Set<string>();

            const result = deleteNodeFromArrays(nodes, edges, selectedNodeIds, 'n1');

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0]!.id).toBe('n2');
        });

        it('should remove connected edges', () => {
            const nodes = [createMockNode('n1'), createMockNode('n2')];
            const edges = [createMockEdge('e1', 'n1', 'n2')];
            const selectedNodeIds = new Set<string>();

            const result = deleteNodeFromArrays(nodes, edges, selectedNodeIds, 'n1');

            expect(result.edges).toHaveLength(0);
        });

        it('should remove from selection', () => {
            const nodes = [createMockNode('n1')];
            const edges: CanvasEdge[] = [];
            const selectedNodeIds = new Set(['n1']);

            const result = deleteNodeFromArrays(nodes, edges, selectedNodeIds, 'n1');

            expect(result.selectedNodeIds.has('n1')).toBe(false);
        });
    });

    describe('getConnectedNodeIds', () => {
        it('should return target nodes for outgoing edges', () => {
            const edges = [createMockEdge('e1', 'n1', 'n2')];
            const result = getConnectedNodeIds(edges, 'n1');

            expect(result).toContain('n2');
        });

        it('should return source nodes for incoming edges', () => {
            const edges = [createMockEdge('e1', 'n1', 'n2')];
            const result = getConnectedNodeIds(edges, 'n2');

            expect(result).toContain('n1');
        });

        it('should return empty array for unconnected node', () => {
            const edges = [createMockEdge('e1', 'n1', 'n2')];
            const result = getConnectedNodeIds(edges, 'n3');

            expect(result).toHaveLength(0);
        });
    });

    describe('getUpstreamNodesFromArrays', () => {
        it('should find immediate upstream node', () => {
            const nodes = [createMockNode('n1'), createMockNode('n2')];
            const edges = [createMockEdge('e1', 'n1', 'n2')];

            const result = getUpstreamNodesFromArrays(nodes, edges, 'n2');

            expect(result).toHaveLength(1);
            expect(result[0]!.id).toBe('n1');
        });

        it('should find transitive upstream nodes', () => {
            const nodes = [createMockNode('n1'), createMockNode('n2'), createMockNode('n3')];
            const edges = [
                createMockEdge('e1', 'n1', 'n2'),
                createMockEdge('e2', 'n2', 'n3'),
            ];

            const result = getUpstreamNodesFromArrays(nodes, edges, 'n3');

            expect(result).toHaveLength(2);
            expect(result.map(n => n.id)).toContain('n1');
            expect(result.map(n => n.id)).toContain('n2');
        });

        it('should handle cycles without infinite loop', () => {
            const nodes = [createMockNode('n1'), createMockNode('n2')];
            const edges = [
                createMockEdge('e1', 'n1', 'n2'),
                createMockEdge('e2', 'n2', 'n1'),
            ];

            const result = getUpstreamNodesFromArrays(nodes, edges, 'n1');

            // Should terminate and return the connected node
            expect(result.length).toBeLessThanOrEqual(2);
        });
    });

    describe('arrangeNodesAfterResize', () => {
        it('should rearrange nodes after resize', () => {
            const nodes = [
                createMockNode('n0', { createdAt: new Date('2024-01-01'), width: 280 }),
                createMockNode('n1', { createdAt: new Date('2024-01-02'), width: 280 }),
            ];

            const result = arrangeNodesAfterResize(nodes, 'n0');

            expect(result).toHaveLength(2);
            // Verify all nodes have positions set
            expect(result[0]?.position.x).toBeDefined();
            expect(result[1]?.position.x).toBeDefined();
        });

        it('should return empty array for empty input', () => {
            const result = arrangeNodesAfterResize([], 'any-id');
            expect(result).toHaveLength(0);
        });
    });

    describe('setNodeColorInArray', () => {
        it('sets node color when changed', () => {
            const nodes = [createMockNode('n1', { data: { prompt: '', output: '', tags: [], colorKey: 'default' } })];
            const result = setNodeColorInArray(nodes, 'n1', 'primary');
            expect(result[0]?.data.colorKey).toBe('primary');
        });

        it('returns original array when color is unchanged', () => {
            const nodes = [createMockNode('n1', { data: { prompt: '', output: '', tags: [], colorKey: 'default' } })];
            const result = setNodeColorInArray(nodes, 'n1', 'default');
            expect(result).toBe(nodes);
        });
    });
});

