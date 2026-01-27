/**
 * useNodeGeneration Hook Tests - TDD: Test stale data bug
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeGeneration } from '../hooks/useNodeGeneration';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import * as geminiService from '../services/geminiService';

// Mock gemini service
vi.mock('../services/geminiService', () => ({
    generateContent: vi.fn(),
    synthesizeNodes: vi.fn(),
    generateContentWithContext: vi.fn(),
}));

describe('useNodeGeneration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    describe('generateFromPrompt', () => {
        it('should use the LATEST node content, not stale closure data', async () => {
            // Setup: Add a node with initial content
            useCanvasStore.getState().addNode({
                id: 'node-1',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Initial prompt' },
                position: { x: 0, y: 0 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('AI Response');

            const { result } = renderHook(() => useNodeGeneration());

            // Simulate: User updates content AFTER hook is initialized
            useCanvasStore.getState().updateNodeContent('node-1', 'Updated prompt');

            // Act: Generate from the node
            await act(async () => {
                await result.current.generateFromPrompt('node-1');
            });

            // Assert: Should use 'Updated prompt', NOT 'Initial prompt'
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Updated prompt',
                [] // No upstream context for single node
            );
        });

        it('should create AI output node and edge after generation', async () => {
            useCanvasStore.getState().addNode({
                id: 'node-1',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Test prompt' },
                position: { x: 100, y: 100 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Generated content');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('node-1');
            });

            const state = useCanvasStore.getState();
            expect(state.nodes).toHaveLength(2); // Original + AI output
            expect(state.edges).toHaveLength(1); // Connection
            expect(state.nodes[1]?.type).toBe('ai_output');
            expect(state.nodes[1]?.data.content).toBe('Generated content');
        });
    });

    describe('generateFromPrompt with edge context', () => {
        it('should call generateContentWithContext with no context when node has no incoming edges', async () => {
            // Single node with no edges
            useCanvasStore.getState().addNode({
                id: 'node-1',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Standalone prompt' },
                position: { x: 0, y: 0 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Standalone response');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('node-1');
            });

            // Should be called with empty context array
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Standalone prompt',
                []
            );
        });

        it('should include single upstream node content in context', async () => {
            // NY -> Node2 (generate here)
            useCanvasStore.getState().addNode({
                id: 'node-NY',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'New York is a great city' },
                position: { x: 0, y: 0 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addNode({
                id: 'node-2',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Tell me about cities' },
                position: { x: 0, y: 150 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addEdge({
                id: 'edge-1',
                workspaceId: 'ws-1',
                sourceNodeId: 'node-NY',
                targetNodeId: 'node-2',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Context-aware response');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('node-2');
            });

            // Should include NY content in context
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Tell me about cities',
                expect.arrayContaining(['New York is a great city'])
            );
        });

        it('should include full upstream chain (NY -> Washington -> Node4)', async () => {
            // NY -> Washington -> Node4
            useCanvasStore.getState().addNode({
                id: 'node-NY',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'New York info' },
                position: { x: 0, y: 0 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addNode({
                id: 'node-Washington',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Washington info' },
                position: { x: 0, y: 150 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addNode({
                id: 'node-4',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Generate about US cities' },
                position: { x: 0, y: 300 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            useCanvasStore.getState().addEdge({
                id: 'edge-1',
                workspaceId: 'ws-1',
                sourceNodeId: 'node-NY',
                targetNodeId: 'node-Washington',
                relationshipType: 'related',
            });
            useCanvasStore.getState().addEdge({
                id: 'edge-2',
                workspaceId: 'ws-1',
                sourceNodeId: 'node-Washington',
                targetNodeId: 'node-4',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Full chain response');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('node-4');
            });

            // Should include both NY and Washington in context
            expect(geminiService.generateContentWithContext).toHaveBeenCalledWith(
                'Generate about US cities',
                expect.arrayContaining(['New York info', 'Washington info'])
            );
        });

        it('should exclude unconnected nodes (London not in context)', async () => {
            // NY -> Washington -> Node4
            // London (NO edges)
            useCanvasStore.getState().addNode({
                id: 'node-NY',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'New York info' },
                position: { x: 0, y: 0 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addNode({
                id: 'node-London',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'London info' },
                position: { x: 200, y: 0 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addNode({
                id: 'node-Washington',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Washington info' },
                position: { x: 0, y: 150 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addNode({
                id: 'node-4',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Generate about US cities' },
                position: { x: 0, y: 300 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Only connect NY -> Washington -> Node4, NOT London
            useCanvasStore.getState().addEdge({
                id: 'edge-1',
                workspaceId: 'ws-1',
                sourceNodeId: 'node-NY',
                targetNodeId: 'node-Washington',
                relationshipType: 'related',
            });
            useCanvasStore.getState().addEdge({
                id: 'edge-2',
                workspaceId: 'ws-1',
                sourceNodeId: 'node-Washington',
                targetNodeId: 'node-4',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('US cities only');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.generateFromPrompt('node-4');
            });

            // Verify the call was made
            expect(geminiService.generateContentWithContext).toHaveBeenCalled();

            // Get the context array that was passed
            const callArgs = vi.mocked(geminiService.generateContentWithContext).mock.calls[0];
            const contextArray = callArgs?.[1] ?? [];

            // Should include NY and Washington
            expect(contextArray).toContain('New York info');
            expect(contextArray).toContain('Washington info');

            // Should NOT include London
            expect(contextArray).not.toContain('London info');
        });
    });

    describe('synthesizeUpstreamChain', () => {
        it('should collect entire upstream chain for synthesis (A→B→C uses A+B)', async () => {
            // Setup chain: A → B → C
            useCanvasStore.getState().addNode({
                id: 'node-A',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Idea A' },
                position: { x: 0, y: 0 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addNode({
                id: 'node-B',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: 'Idea B' },
                position: { x: 0, y: 150 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            useCanvasStore.getState().addNode({
                id: 'node-C',
                workspaceId: 'ws-1',
                type: 'prompt',
                data: { content: '' }, // Target node - will receive synthesized content
                position: { x: 0, y: 300 },
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Create edges: A → B → C
            useCanvasStore.getState().addEdge({
                id: 'edge-AB',
                workspaceId: 'ws-1',
                sourceNodeId: 'node-A',
                targetNodeId: 'node-B',
                relationshipType: 'related',
            });
            useCanvasStore.getState().addEdge({
                id: 'edge-BC',
                workspaceId: 'ws-1',
                sourceNodeId: 'node-B',
                targetNodeId: 'node-C',
                relationshipType: 'related',
            });

            vi.mocked(geminiService.synthesizeNodes).mockResolvedValue('Synthesized from A+B');

            const { result } = renderHook(() => useNodeGeneration());

            await act(async () => {
                await result.current.synthesizeUpstreamChain('node-C');
            });

            // Verify synthesizeNodes was called with BOTH A and B content
            expect(geminiService.synthesizeNodes).toHaveBeenCalledWith(
                expect.arrayContaining(['Idea A', 'Idea B'])
            );

            // Verify node C was updated with synthesized content
            const nodeC = useCanvasStore.getState().nodes.find(n => n.id === 'node-C');
            expect(nodeC?.data.content).toBe('Synthesized from A+B');
        });
    });
});
