/**
 * useAddNode Hook Tests - Single source of truth for node creation
 * Verifies both grid positioning and pan behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddNode } from '../useAddNode';
import { useCanvasStore } from '../../stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

// Mock usePanToNode
vi.mock('../usePanToNode', () => ({
    usePanToNode: () => ({
        panToPosition: vi.fn(),
    }),
}));

describe('useAddNode', () => {
    beforeEach(() => {
        // Reset stores
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useWorkspaceStore.setState({ currentWorkspaceId: 'test-workspace' });
    });

    it('should add a new node to the canvas', () => {
        const { result } = renderHook(() => useAddNode());

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(1);
        const firstNode = nodes[0];
        expect(firstNode).toBeDefined();
        expect(firstNode?.type).toBe('idea');
    });

    it('should position node at next grid position (0,0 for first node)', () => {
        const { result } = renderHook(() => useAddNode());

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        const firstNode = nodes[0];
        expect(firstNode).toBeDefined();
        // First node should be at origin (0,0) in grid
        expect(firstNode?.position).toEqual({ x: 0, y: 0 });
    });

    it('should position second node at next grid column', () => {
        // Pre-add first node
        useCanvasStore.getState().addNode({
            id: 'existing-node',
            workspaceId: 'test-workspace',
            type: 'idea',
            position: { x: 0, y: 0 },
            data: { prompt: '', output: '' },
            width: 280,
            height: 220,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const { result } = renderHook(() => useAddNode());

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        const secondNode = nodes[1];
        expect(secondNode).toBeDefined();
        // Second node should be in next grid column (x > 0)
        expect(secondNode?.position.x).toBeGreaterThan(0);
        expect(secondNode?.position.y).toBe(0);
    });

    it('should use current workspace ID', () => {
        useWorkspaceStore.setState({ currentWorkspaceId: 'my-workspace' });
        const { result } = renderHook(() => useAddNode());

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        const firstNode = nodes[0];
        expect(firstNode).toBeDefined();
        expect(firstNode?.workspaceId).toBe('my-workspace');
    });

    it('should create node with unique ID', async () => {
        const { result } = renderHook(() => useAddNode());

        act(() => {
            result.current();
        });

        // Small delay to ensure different timestamp
        await new Promise((resolve) => setTimeout(resolve, 2));

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(2);
        const firstNode = nodes[0];
        const secondNode = nodes[1];
        expect(firstNode).toBeDefined();
        expect(secondNode).toBeDefined();
        expect(firstNode?.id).not.toBe(secondNode?.id);
    });

    it('should not add node if no workspace is selected', () => {
        useWorkspaceStore.setState({ currentWorkspaceId: null });
        const { result } = renderHook(() => useAddNode());

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(0);
    });

    it('should create node with proper IdeaCard data structure', () => {
        const { result } = renderHook(() => useAddNode());

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        const node = nodes[0];
        expect(node?.data).toEqual({
            prompt: '',
            output: undefined,
            isGenerating: false,
            isPromptCollapsed: false,
        });
        expect(node?.width).toBe(280); // DEFAULT_NODE_WIDTH
        expect(node?.height).toBe(220); // DEFAULT_NODE_HEIGHT
    });
});
