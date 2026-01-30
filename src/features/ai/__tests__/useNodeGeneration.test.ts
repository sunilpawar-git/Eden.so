/**
 * useNodeGeneration Hook Tests - Tests for IdeaCard generation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeGeneration } from '../hooks/useNodeGeneration';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import * as geminiService from '../services/geminiService';
import type { IdeaNodeData } from '@/features/canvas/types/node';

// Mock gemini service
vi.mock('../services/geminiService', () => ({
    generateContent: vi.fn(),
    generateContentWithContext: vi.fn(),
}));

// Helper to create IdeaCard node
const createTestIdeaNode = (id: string, prompt: string, output?: string) => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea' as const,
    data: {
        prompt,
        output,
        isGenerating: false,
        isPromptCollapsed: false,
    } as IdeaNodeData,
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('useNodeGeneration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    describe('generateFromPrompt', () => {
        it('should update IdeaCard output in-place (no new node)', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', 'Test prompt'));

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Generated output');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            const state = useCanvasStore.getState();
            // Should still have only 1 node
            expect(state.nodes).toHaveLength(1);
            // Output should be updated in-place
            expect((state.nodes[0]?.data as IdeaNodeData).output).toBe('Generated output');
        });

        it('should use the LATEST prompt content, not stale closure data', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', 'Initial prompt'));

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('AI Response');

            const { result } = renderHook(() => useNodeGeneration());

            // Update prompt AFTER hook is initialized
            useCanvasStore.getState().updateNodePrompt('idea-1', 'Updated prompt');

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            // Should use 'Updated prompt', NOT 'Initial prompt'
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Updated prompt',
                []
            );
        });

        it('should not create node if prompt is empty', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', ''));

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            expect(geminiService.generateContentWithContext).not.toHaveBeenCalled();
        });

        it('should set generating state while processing', async () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-1', 'Test'));

            let generatingState: boolean | undefined;
            vi.mocked(geminiService.generateContentWithContext).mockImplementation(async () => {
                generatingState = (useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).isGenerating;
                return 'Response';
            });

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('idea-1');
            });

            // Should have been true during generation
            expect(generatingState).toBe(true);
            // Should be false after completion
            expect((useCanvasStore.getState().nodes[0]?.data as IdeaNodeData).isGenerating).toBe(false);
        });
    });

    describe('generateFromPrompt with upstream context', () => {
        it('should include upstream IdeaCard prompts in context', async () => {
            // idea-parent -> idea-child
            const parentNode = createTestIdeaNode('idea-parent', 'Parent prompt');
            const childNode = createTestIdeaNode('idea-child', 'Child prompt');

            useCanvasStore.getState().addNode(parentNode);
            useCanvasStore.getState().addNode(childNode);
            useCanvasStore.getState().addEdge({
                id: 'edge-1',
                workspaceId: 'ws-1',
                sourceNodeId: 'idea-parent',
                targetNodeId: 'idea-child',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Context response');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('idea-child');
            });

            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Child prompt',
                expect.arrayContaining(['Parent prompt'])
            );
        });

        it('should include upstream Note content (output) in context', async () => {
            // Note (output only) -> AI Node
            const noteNode = createTestIdeaNode('node-1', '', 'Note content');
            const aiNode = createTestIdeaNode('node-2', 'AI prompt');

            useCanvasStore.getState().addNode(noteNode);
            useCanvasStore.getState().addNode(aiNode);
            useCanvasStore.getState().addEdge({
                id: 'edge-1',
                workspaceId: 'ws-1',
                sourceNodeId: 'node-1',
                targetNodeId: 'node-2',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Response');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('node-2');
            });

            // Currently, this will FAIL because it only looks for .prompt
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'AI prompt',
                expect.arrayContaining(['Note content'])
            );
        });

        it('should prioritize output over prompt for context when both exist', async () => {
            // AI Node (prompt + output) -> AI Node
            const parentNode = createTestIdeaNode('parent', 'Parent prompt', 'Parent output');
            const childNode = createTestIdeaNode('child', 'Child prompt');

            useCanvasStore.getState().addNode(parentNode);
            useCanvasStore.getState().addNode(childNode);
            useCanvasStore.getState().addEdge({
                id: 'edge-1',
                workspaceId: 'ws-1',
                sourceNodeId: 'parent',
                targetNodeId: 'child',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Response');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('child');
            });

            // Should use 'Parent output' instead of 'Parent prompt'
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Child prompt',
                expect.arrayContaining(['Parent output'])
            );
        });

        it('should preserve chronological order in multi-level chains', async () => {
            // Grandparent -> Parent -> Child
            const grandparent = createTestIdeaNode('grandparent', 'Grandparent idea');
            const parent = createTestIdeaNode('parent', 'Parent evolution');
            const child = createTestIdeaNode('child', 'Child synthesis');

            useCanvasStore.getState().addNode(grandparent);
            useCanvasStore.getState().addNode(parent);
            useCanvasStore.getState().addNode(child);

            // G -> P
            useCanvasStore.getState().addEdge({
                id: 'e1',
                workspaceId: 'ws-1',
                sourceNodeId: 'grandparent',
                targetNodeId: 'parent',
                relationshipType: 'related',
            });
            // P -> C
            useCanvasStore.getState().addEdge({
                id: 'e2',
                workspaceId: 'ws-1',
                sourceNodeId: 'parent',
                targetNodeId: 'child',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Response');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('child');
            });

            // Context should be [Grandparent, Parent]
            const contextChain = vi.mocked(geminiService.generateContentWithContext).mock.calls[0]?.[1];
            expect(contextChain).toEqual(['Grandparent idea', 'Parent evolution']);
        });

        it('should exclude unconnected nodes from context', async () => {
            const connected = createTestIdeaNode('idea-connected', 'Connected prompt');
            const unconnected = createTestIdeaNode('idea-unconnected', 'Unconnected prompt');
            const target = createTestIdeaNode('idea-target', 'Target prompt');

            useCanvasStore.getState().addNode(connected);
            useCanvasStore.getState().addNode(unconnected);
            useCanvasStore.getState().addNode(target);

            // Only connect 'connected' to 'target'
            useCanvasStore.getState().addEdge({
                id: 'edge-1',
                workspaceId: 'ws-1',
                sourceNodeId: 'idea-connected',
                targetNodeId: 'idea-target',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Response');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('idea-target');
            });

            const callArgs = vi.mocked(geminiService.generateContentWithContext).mock.calls[0];
            const contextArray = callArgs?.[1] ?? [];

            expect(contextArray).toContain('Connected prompt');
            expect(contextArray).not.toContain('Unconnected prompt');
        });
    });

    describe('branchFromNode', () => {
        it('should create new IdeaCard connected to source', () => {
            useCanvasStore.getState().addNode(createTestIdeaNode('idea-source', 'Source prompt', 'Source output'));

            const { result } = renderHook(() => useNodeGeneration());

            act(() => {
                result.current.branchFromNode('idea-source');
            });

            const state = useCanvasStore.getState();
            // Should have 2 nodes now
            expect(state.nodes).toHaveLength(2);
            // New node should be idea type
            expect(state.nodes[1]?.type).toBe('idea');
            // New node should have empty prompt
            expect((state.nodes[1]?.data as IdeaNodeData).prompt).toBe('');
            // Should have edge connecting them
            expect(state.edges).toHaveLength(1);
            expect(state.edges[0]?.sourceNodeId).toBe('idea-source');
        });

        it('should position new node to the right of source', () => {
            const sourceNode = createTestIdeaNode('idea-source', 'Source');
            sourceNode.position = { x: 100, y: 200 };
            useCanvasStore.getState().addNode(sourceNode);

            const { result } = renderHook(() => useNodeGeneration());

            act(() => {
                result.current.branchFromNode('idea-source');
            });

            const newNode = useCanvasStore.getState().nodes[1];
            expect(newNode?.position.x).toBeGreaterThan(100);
            expect(newNode?.position.y).toBe(200);
        });
    });
});
