/**
 * useAddNode Hook Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { ReactNode } from 'react';
import { useAddNode } from '../useAddNode';
import { useCanvasStore } from '../../stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

// Mock ReactFlow's useReactFlow hook
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        useReactFlow: () => ({
            screenToFlowPosition: vi.fn().mockReturnValue({ x: 100, y: 200 }),
        }),
    };
});

describe('useAddNode', () => {
    beforeEach(() => {
        // Reset stores
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useWorkspaceStore.setState({ currentWorkspaceId: 'test-workspace' });
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ReactFlowProvider>{children}</ReactFlowProvider>
    );

    it('should add a new node to the canvas', () => {
        const { result } = renderHook(() => useAddNode(), { wrapper });

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(1);
        const firstNode = nodes[0];
        expect(firstNode).toBeDefined();
        expect(firstNode?.type).toBe('idea');
    });

    it('should position node at viewport center', () => {
        const { result } = renderHook(() => useAddNode(), { wrapper });

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        const firstNode = nodes[0];
        expect(firstNode).toBeDefined();
        expect(firstNode?.position).toEqual({ x: 100, y: 200 });
    });

    it('should use current workspace ID', () => {
        useWorkspaceStore.setState({ currentWorkspaceId: 'my-workspace' });
        const { result } = renderHook(() => useAddNode(), { wrapper });

        act(() => {
            result.current();
        });

        const nodes = useCanvasStore.getState().nodes;
        const firstNode = nodes[0];
        expect(firstNode).toBeDefined();
        expect(firstNode?.workspaceId).toBe('my-workspace');
    });

    it('should create node with unique ID', async () => {
        const { result } = renderHook(() => useAddNode(), { wrapper });

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
});
