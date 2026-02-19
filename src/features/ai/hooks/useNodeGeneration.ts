/**
 * useNodeGeneration Hook - Bridges AI service with canvas store
 * Handles AI generation for IdeaCard nodes
 * Intercepts calendar intents to create events seamlessly
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '../stores/aiStore';
import { generateContentWithContext } from '../services/geminiService';
import { createIdeaNode } from '@/features/canvas/types/node';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import { useKnowledgeBankContext } from '@/features/knowledgeBank/hooks/useKnowledgeBankContext';
import { detectCalendarIntent, type CalendarIntentResult } from '@/features/calendar/services/calendarIntentService';
import { isCalendarAvailable } from '@/features/calendar/services/calendarClient';
import { createEvent } from '@/features/calendar/services/calendarService';
import { calendarStrings as cs } from '@/features/calendar/localization/calendarStrings';

const BRANCH_OFFSET_X = 350;

/**
 * Handle a detected calendar intent: create event if OAuth available, display confirmation
 */
async function handleCalendarIntent(nodeId: string, intent: CalendarIntentResult): Promise<void> {
    const store = useCanvasStore.getState();
    store.updateNodeOutput(nodeId, intent.confirmation);

    if (!isCalendarAvailable()) {
        toast.info(cs.errors.noToken);
        return;
    }

    try {
        const meta = await createEvent(intent.type, intent.title, intent.date, intent.endDate, intent.notes);
        store.setNodeCalendarEvent(nodeId, meta);
    } catch {
        toast.error(cs.errors.createFailed);
    }
}

/**
 * Hook for generating AI content from IdeaCard nodes
 */
export function useNodeGeneration() {
    const { addNode } = useCanvasStore();
    const { startGeneration, completeGeneration, setError } = useAIStore();
    const { getKBContext } = useKnowledgeBankContext();

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
            // Heading is SSOT for prompts; fall back to prompt for legacy data
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-deprecated -- intentional: empty string fallback + legacy field access
            const promptText = (ideaData.heading?.trim() || ideaData.prompt) || '';
            if (!promptText) return;

            // Collect upstream context via edges
            const upstreamNodes = useCanvasStore.getState().getUpstreamNodes(nodeId);

            // Reverse for chronological order (oldest ancestor first)
            // Filter to include any node with content (heading/prompt OR output)
            // When both heading and output exist, combine them for semantic context
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

                    // When both heading and content exist, combine them with blank line separator
                    if (heading && content) {
                        return `${heading}\n\n${content}`;
                    }

                    // Otherwise, use whichever exists
                    return content || heading;
                });

            // Intercept calendar intent before general AI generation
            const calendarIntent = await detectCalendarIntent(promptText);
            if (calendarIntent) {
                await handleCalendarIntent(nodeId, calendarIntent);
                return;
            }

            // Set generating state on the node
            useCanvasStore.getState().setNodeGenerating(nodeId, true);
            startGeneration(nodeId);

            try {
                const generationType = contextChain.length > 0 ? 'chain' as const : 'single' as const;
                const kbContext = getKBContext(promptText, generationType);
                const content = await generateContentWithContext(promptText, contextChain, kbContext);

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
