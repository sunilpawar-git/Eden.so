/**
 * useNodeGeneration Hook - Bridges AI service with canvas store
 * Handles AI generation for IdeaCard nodes
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '../stores/aiStore';
import { generateContentWithContext } from '../services/geminiService';
import { createIdeaNode } from '@/features/canvas/types/node';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';

const BRANCH_OFFSET_X = 350;

/**
 * Hook for generating AI content from IdeaCard nodes
 */
 
export function useNodeGeneration() {
    const { addNode } = useCanvasStore();
    const { startGeneration, completeGeneration, setError } = useAIStore();

    /**
     * Generate AI output from an IdeaCard node
     * Updates output in-place (no new node created)
     */
    const generateFromPrompt = useCallback(
        async (nodeId: string) => {
            // CRITICAL: Use getState() for fresh data, not closure
            const freshNodes = useCanvasStore.getState().nodes;
            const node = freshNodes.find((n) => n.id === nodeId);
            if (node?.type !== 'idea') return;

            const ideaData = node.data;
            if (!ideaData.prompt) return;

            // Collect upstream context via edges
            const upstreamNodes = useCanvasStore.getState().getUpstreamNodes(nodeId);

            // Reverse for chronological order (oldest ancestor first)
            // Filter to include any node with content (prompt OR output)
            // Prioritize output over prompt for context (AI results are more relevant)
            const contextChain: string[] = upstreamNodes
                .reverse()
                .filter((n) => {
                    const data = n.data;
                    return data.prompt || data.output;
                })
                .map((n) => {
                    const data = n.data;
                    return data.output ?? data.prompt;
                });

            // Set generating state on the node
            useCanvasStore.getState().setNodeGenerating(nodeId, true);
            startGeneration(nodeId);

            try {
                const content = await generateContentWithContext(ideaData.prompt, contextChain);

                // Update output in-place (no new node created!)
                useCanvasStore.getState().updateNodeOutput(nodeId, content);
                useCanvasStore.getState().setNodeGenerating(nodeId, false);
                completeGeneration();
            } catch (error) {
                const message = error instanceof Error ? error.message : strings.errors.aiError;
                useCanvasStore.getState().setNodeGenerating(nodeId, false);
                setError(message);
                toast.error(message);
            }
        },
        [startGeneration, completeGeneration, setError]
    );

    /**
     * Branch from an IdeaCard to create a new connected IdeaCard
     */
    const branchFromNode = useCallback(
        (sourceNodeId: string) => {
            const freshNodes = useCanvasStore.getState().nodes;
            const sourceNode = freshNodes.find((n) => n.id === sourceNodeId);
            if (!sourceNode) return;

            const newNode = createIdeaNode(
                `idea-${Date.now()}`,
                sourceNode.workspaceId,
                {
                    x: sourceNode.position.x + BRANCH_OFFSET_X,
                    y: sourceNode.position.y,
                },
                '' // Empty prompt for user to fill
            );

            addNode(newNode);

            // Connect source to new node
            useCanvasStore.getState().addEdge({
                id: `edge-${Date.now()}`,
                workspaceId: sourceNode.workspaceId,
                sourceNodeId,
                targetNodeId: newNode.id,
                relationshipType: 'related',
            });

            return newNode.id;
        },
        [addNode]
    );

    return {
        generateFromPrompt,
        branchFromNode,
    };
}
