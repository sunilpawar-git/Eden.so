/**
 * useNodeTransformation Hook Tests - TDD Phase 4
 * Tests for AI-based content transformation functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeTransformation } from '../hooks/useNodeTransformation';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import * as geminiService from '../services/geminiService';

// Mock geminiService
vi.mock('../services/geminiService', () => ({
    transformContent: vi.fn(),
}));

describe('useNodeTransformation - Phase 4', () => {
    const mockTransformContent = vi.mocked(geminiService.transformContent);

    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: {
                        prompt: '',
                        output: 'Original content to transform',
                        isGenerating: false,
                    },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('should call transformContent with node output and transformation type', async () => {
        mockTransformContent.mockResolvedValueOnce('Refined content');

        const { result } = renderHook(() => useNodeTransformation());

        await act(async () => {
            await result.current.transformNodeContent('node-1', 'refine');
        });

        expect(mockTransformContent).toHaveBeenCalledWith(
            'Original content to transform',
            'refine'
        );
    });

    it('should update node output with transformed content', async () => {
        mockTransformContent.mockResolvedValueOnce('Shortened content');

        const { result } = renderHook(() => useNodeTransformation());

        await act(async () => {
            await result.current.transformNodeContent('node-1', 'shorten');
        });

        // Verify store was updated
        const updatedNode = useCanvasStore.getState().nodes.find(n => n.id === 'node-1');
        expect(updatedNode?.data.output).toBe('Shortened content');
    });

    it('should reset isTransforming to false after transformation completes', async () => {
        mockTransformContent.mockResolvedValueOnce('Transformed content');

        const { result } = renderHook(() => useNodeTransformation());

        // Initially false
        expect(result.current.isTransforming).toBe(false);

        await act(async () => {
            await result.current.transformNodeContent('node-1', 'lengthen');
        });

        // After completion, should be false
        expect(result.current.isTransforming).toBe(false);
    });

    it('should handle transformation errors gracefully', async () => {
        mockTransformContent.mockRejectedValueOnce(new Error('API error'));

        const { result } = renderHook(() => useNodeTransformation());

        // Should not throw
        await act(async () => {
            await result.current.transformNodeContent('node-1', 'proofread');
        });

        // isTransforming should be false after error
        expect(result.current.isTransforming).toBe(false);
        
        // Original content should be preserved (mock rejected, so no update called)
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1');
        expect(node?.data.output).toBe('Original content to transform');
    });

    it('should not call transformContent if node has no output', async () => {
        // Set up node with no output
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'empty-node',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: {
                        prompt: '',
                        output: undefined,
                        isGenerating: false,
                    },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });

        // Clear mock from beforeEach
        mockTransformContent.mockClear();

        const { result } = renderHook(() => useNodeTransformation());

        await act(async () => {
            await result.current.transformNodeContent('empty-node', 'refine');
        });

        expect(mockTransformContent).not.toHaveBeenCalled();
    });

    it('should not call transformContent if node does not exist', async () => {
        // Clear mock from beforeEach
        mockTransformContent.mockClear();

        const { result } = renderHook(() => useNodeTransformation());

        await act(async () => {
            await result.current.transformNodeContent('non-existent', 'refine');
        });

        expect(mockTransformContent).not.toHaveBeenCalled();
    });
});
