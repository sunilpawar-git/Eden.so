/**
 * canvasStore.duplicateNode action tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';

const makeNode = (id = 'idea-1', workspaceId = 'ws-1'): CanvasNode => ({
    id,
    workspaceId,
    type: 'idea',
    data: {
        heading: 'Hello',
        output: 'World',
        isGenerating: false,
        isPromptCollapsed: false,
    },
    position: { x: 0, y: 0 },
    width: 280,
    height: 220,
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('canvasStore.duplicateNode', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('adds a new node to the store', () => {
        useCanvasStore.setState({ nodes: [makeNode()] });
        useCanvasStore.getState().duplicateNode('idea-1');
        expect(useCanvasStore.getState().nodes).toHaveLength(2);
    });

    it('returns the new node ID', () => {
        useCanvasStore.setState({ nodes: [makeNode()] });
        const newId = useCanvasStore.getState().duplicateNode('idea-1');
        expect(newId).toMatch(/^idea-[0-9a-f-]{36}$/);
    });

    it('returns undefined when node not found', () => {
        const result = useCanvasStore.getState().duplicateNode('nonexistent');
        expect(result).toBeUndefined();
    });

    it('does not add a node when source not found', () => {
        useCanvasStore.getState().duplicateNode('nonexistent');
        expect(useCanvasStore.getState().nodes).toHaveLength(0);
    });

    it('new node has offset position', () => {
        useCanvasStore.setState({ nodes: [makeNode()] });
        useCanvasStore.getState().duplicateNode('idea-1');
        const newNode = useCanvasStore.getState().nodes[1];
        expect(newNode?.position).toEqual({ x: 0, y: 50 });
    });

    it('preserves content in the duplicate', () => {
        useCanvasStore.setState({ nodes: [makeNode()] });
        useCanvasStore.getState().duplicateNode('idea-1');
        const newNode = useCanvasStore.getState().nodes[1];
        expect(newNode?.data.heading).toBe('Hello');
        expect(newNode?.data.output).toBe('World');
    });

    it('new node has a different ID from original', () => {
        useCanvasStore.setState({ nodes: [makeNode()] });
        useCanvasStore.getState().duplicateNode('idea-1');
        const [original, duplicate] = useCanvasStore.getState().nodes;
        expect(duplicate?.id).not.toBe(original?.id);
    });
});
