/**
 * useNodeGeneration - branchFromNode Tests
 * Split from useNodeGeneration.test.ts to stay within 300-line limit
 */
/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeGeneration } from '../hooks/useNodeGeneration';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import type { IdeaNodeData } from '@/features/canvas/types/node';
import { GRID_PADDING } from '@/features/canvas/services/gridLayoutService';

vi.mock('../services/geminiService', () => ({
    generateContent: vi.fn(),
    generateContentWithContext: vi.fn(),
}));

const createTestIdeaNode = (id: string, prompt: string, output?: string) => ({
    id, workspaceId: 'ws-1', type: 'idea' as const,
    data: { prompt, output, isGenerating: false, isPromptCollapsed: false } as IdeaNodeData,
    position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
});

describe('useNodeGeneration - branchFromNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('should create new IdeaCard connected to source', () => {
        useCanvasStore.getState().addNode(createTestIdeaNode('idea-source', 'Source prompt', 'Source output'));

        const { result } = renderHook(() => useNodeGeneration());

        act(() => { result.current.branchFromNode('idea-source'); });

        const state = useCanvasStore.getState();
        expect(state.nodes).toHaveLength(2);
        expect(state.nodes[1]?.type).toBe('idea');
        expect((state.nodes[1]?.data!).prompt).toBeUndefined();
        expect(state.edges).toHaveLength(1);
        expect(state.edges[0]?.sourceNodeId).toBe('idea-source');
    });

    it('should position new node at next masonry grid slot (not hardcoded offset)', () => {
        const sourceNode = createTestIdeaNode('idea-source', 'Source');
        sourceNode.position = { x: 100, y: 200 };
        useCanvasStore.getState().addNode(sourceNode);

        const { result } = renderHook(() => useNodeGeneration());

        act(() => { result.current.branchFromNode('idea-source'); });

        const newNode = useCanvasStore.getState().nodes[1]!;
        const isHardcodedOffset = newNode.position.x === 100 + 350 && newNode.position.y === 200;
        expect(isHardcodedOffset).toBe(false);
    });

    it('should place branch at grid padding when canvas has single node', () => {
        const sourceNode = createTestIdeaNode('idea-source', 'Source');
        sourceNode.position = { x: GRID_PADDING, y: GRID_PADDING };
        useCanvasStore.getState().addNode(sourceNode);

        const { result } = renderHook(() => useNodeGeneration());

        act(() => { result.current.branchFromNode('idea-source'); });

        const state = useCanvasStore.getState();
        expect(state.nodes).toHaveLength(2);
        const newNode = state.nodes[1];
        expect(newNode?.position.y).toBe(GRID_PADDING);
        expect(newNode?.position.x).toBeGreaterThan(GRID_PADDING);
    });

    it('should create edge between source and branch', () => {
        useCanvasStore.getState().addNode(createTestIdeaNode('idea-source', 'Source'));

        const { result } = renderHook(() => useNodeGeneration());

        act(() => { result.current.branchFromNode('idea-source'); });

        const edges = useCanvasStore.getState().edges;
        expect(edges).toHaveLength(1);
        expect(edges[0]?.sourceNodeId).toBe('idea-source');
        expect(edges[0]?.relationshipType).toBe('related');
    });
});
