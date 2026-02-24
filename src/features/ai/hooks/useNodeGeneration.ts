/**
 * useNodeGeneration Hook - Bridges AI service with canvas store
 * Handles AI generation for IdeaCard nodes
 * Calendar intent interception delegated to calendarIntentHandler
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '../stores/aiStore';
import { generateContentWithContext } from '../services/geminiService';
import { createIdeaNode } from '@/features/canvas/types/node';
import { calculateMasonryPosition } from '@/features/canvas/services/gridLayoutService';
import { usePanToNode } from '@/features/canvas/hooks/usePanToNode';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import { useKnowledgeBankContext } from '@/features/knowledgeBank/hooks/useKnowledgeBankContext';
import { processCalendarIntent } from '@/features/calendar/services/calendarIntentHandler';

/**
 * Hook for generating AI content from IdeaCard nodes
 */
export function useNodeGeneration() {
    const { addNode } = useCanvasStore();
    const { startGeneration, completeGeneration, setError } = useAIStore();
    const { getKBContext } = useKnowledgeBankContext();
    const { panToPosition } = usePanToNode();

    /**
     * Generate AI output from an IdeaCard node
     * Updates output in-place (no new node created)
     */
    const generateFromPrompt = useCallback(
        async (nodeId: string) => {
            const freshNodes = useCanvasStore.getState().nodes;
            const node = freshNodes.find((n) => n.id === nodeId);
            if (node?.type !== 'idea') return;

            const ideaData = node.data;
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-deprecated -- intentional: empty string fallback + legacy field access
            const promptText = (ideaData.heading?.trim() || ideaData.prompt) || '';
            if (!promptText) return;

            // Set generating immediately before any async work to prevent placeholder flash
            useCanvasStore.getState().setNodeGenerating(nodeId, true);

            try {
                // Calendar intent interception (spinner already set above)
                const handled = await processCalendarIntent(nodeId, promptText);
                if (handled) return;

                // Collect upstream context via edges
                const upstreamNodes = useCanvasStore.getState().getUpstreamNodes(nodeId);
                const contextChain: string[] = upstreamNodes
                    .reverse()
                    .filter((n) => {
                        const d = n.data;
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-deprecated -- intentional: empty string fallback + legacy field
                        return !!(d.heading?.trim() || d.prompt || d.output);
                    })
                    .map((n) => {
                        const d = n.data;
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: empty string fallback
                        const heading = d.heading?.trim() || '';
                        // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy field access for backward compat
                        const content = d.output ?? d.prompt ?? '';
                        if (heading && content) return `${heading}\n\n${content}`;
                        return content || heading;
                    });

                startGeneration(nodeId);
                const generationType = contextChain.length > 0 ? 'chain' as const : 'single' as const;
                const kbContext = getKBContext(promptText, generationType);
                const content = await generateContentWithContext(promptText, contextChain, kbContext);

                useCanvasStore.getState().updateNodeOutput(nodeId, content);
                completeGeneration();
            } catch (error) {
                const message = error instanceof Error ? error.message : strings.errors.aiError;
                setError(message);
                toast.error(message);
            } finally {
                useCanvasStore.getState().setNodeGenerating(nodeId, false);
            }
        },
        [startGeneration, completeGeneration, setError, getKBContext]
    );

    /**
     * Branch from an IdeaCard to create a new connected IdeaCard
     */
    const branchFromNode = useCallback(
        (sourceNodeId: string) => {
            const freshNodes = useCanvasStore.getState().nodes;
            const sourceNode = freshNodes.find((n) => n.id === sourceNodeId);
            if (!sourceNode) return;

            const position = calculateMasonryPosition(freshNodes);
            const newNode = createIdeaNode(
                `idea-${crypto.randomUUID()}`,
                sourceNode.workspaceId,
                position,
                ''
            );

            addNode(newNode);
            panToPosition(position.x, position.y);

            // Connect source to new node
            useCanvasStore.getState().addEdge({
                id: `edge-${crypto.randomUUID()}`,
                workspaceId: sourceNode.workspaceId,
                sourceNodeId,
                targetNodeId: newNode.id,
                relationshipType: 'related',
            });

            return newNode.id;
        },
        [addNode, panToPosition]
    );

    return {
        generateFromPrompt,
        branchFromNode,
    };
}
