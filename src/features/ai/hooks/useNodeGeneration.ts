/**
 * useNodeGeneration Hook - Bridges AI service with canvas store
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '../stores/aiStore';
import { generateContent, synthesizeNodes } from '../services/geminiService';
import { createAIOutputNode, createDerivedNode } from '@/features/canvas/types/node';

const AI_NODE_OFFSET_Y = 150;

/**
 * Hook for generating AI content from a prompt node
 */
export function useNodeGeneration() {
    const { nodes, addNode } = useCanvasStore();
    const { startGeneration, completeGeneration, setError } = useAIStore();

    /**
     * Generate AI output from a prompt node
     */
    const generateFromPrompt = useCallback(
        async (promptNodeId: string) => {
            const promptNode = nodes.find((n) => n.id === promptNodeId);
            if (!promptNode || !promptNode.data.content) return;

            startGeneration(promptNodeId);

            try {
                const content = await generateContent(promptNode.data.content as string);

                // Position AI output below the prompt
                const newNode = createAIOutputNode(
                    `ai-${Date.now()}`,
                    promptNode.workspaceId,
                    {
                        x: promptNode.position.x,
                        y: promptNode.position.y + AI_NODE_OFFSET_Y,
                    },
                    content
                );

                addNode(newNode);
                completeGeneration();

                // Auto-connect prompt to output
                useCanvasStore.getState().addEdge({
                    id: `edge-${Date.now()}`,
                    workspaceId: promptNode.workspaceId,
                    sourceNodeId: promptNodeId,
                    targetNodeId: newNode.id,
                    relationshipType: 'derived',
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Generation failed';
                setError(message);
            }
        },
        [nodes, addNode, startGeneration, completeGeneration, setError]
    );

    /**
     * Synthesize content from connected nodes
     */
    const synthesizeConnectedNodes = useCallback(
        async (nodeIds: string[]) => {
            if (nodeIds.length < 2) return;

            const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id));
            if (selectedNodes.length < 2) return;

            startGeneration(nodeIds[0] ?? '');

            try {
                const contents = selectedNodes.map((n) => n.data.content as string);
                const synthesizedContent = await synthesizeNodes(contents);

                // Calculate center position between nodes
                const avgX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length;
                const avgY = selectedNodes.reduce((sum, n) => sum + n.position.y, 0) / selectedNodes.length;

                const newNode = createDerivedNode(
                    `derived-${Date.now()}`,
                    selectedNodes[0]?.workspaceId ?? '',
                    { x: avgX, y: avgY + AI_NODE_OFFSET_Y },
                    synthesizedContent
                );

                addNode(newNode);
                completeGeneration();

                // Connect all source nodes to derived node
                selectedNodes.forEach((sourceNode) => {
                    useCanvasStore.getState().addEdge({
                        id: `edge-${Date.now()}-${sourceNode.id}`,
                        workspaceId: sourceNode.workspaceId,
                        sourceNodeId: sourceNode.id,
                        targetNodeId: newNode.id,
                        relationshipType: 'derived',
                    });
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Synthesis failed';
                setError(message);
            }
        },
        [nodes, addNode, startGeneration, completeGeneration, setError]
    );

    return {
        generateFromPrompt,
        synthesizeConnectedNodes,
    };
}
