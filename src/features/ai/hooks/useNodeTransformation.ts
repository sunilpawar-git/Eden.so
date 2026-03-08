/**
 * useNodeTransformation Hook - AI-based content transformation
 * Provides transformation capabilities for IdeaCard nodes
 */
import { useCallback, useState } from 'react';
import { useCanvasStore, getNodeMap } from '@/features/canvas/stores/canvasStore';
import { useHistoryStore } from '@/features/canvas/stores/historyStore';
import { transformContent, type TransformationType } from '../services/geminiService';
import { useKnowledgeBankContext } from '@/features/knowledgeBank/hooks/useKnowledgeBankContext';
import { useNodePoolContext } from './useNodePoolContext';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';

/**
 * Hook for transforming node content using AI
 * Supports: refine, shorten, lengthen, proofread
 */
export function useNodeTransformation() {
    const [isTransforming, setIsTransforming] = useState(false);
    const { getKBContext } = useKnowledgeBankContext();
    const { getPoolContext } = useNodePoolContext();

    /**
     * Transform node content using the specified transformation type
     */
    const transformNodeContent = useCallback(
        async (nodeId: string, type: TransformationType) => {
            // Get fresh node data from store
            const node = getNodeMap(useCanvasStore.getState().nodes).get(nodeId);
            if (node?.type !== 'idea') return;

            const content = node.data.output;
            if (!content) return;

            // Capture pre-transform state for undo
            const preTransformOutput = content;

            setIsTransforming(true);

            try {
                const excludeIds = new Set([nodeId]);
                const [poolContext, kbContext] = await Promise.all([
                    getPoolContext(content, 'transform', excludeIds),
                    Promise.resolve(getKBContext(content, 'transform')),
                ]);
                const transformedContent = await transformContent(content, type, poolContext, kbContext);
                useCanvasStore.getState().updateNodeOutput(nodeId, transformedContent);

                // Push undo command after successful transform
                useHistoryStore.getState().dispatch({
                    type: 'PUSH',
                    command: {
                        type: 'transformContent',
                        timestamp: Date.now(),
                        entityId: nodeId,
                        undo: () => {
                            useCanvasStore.getState().updateNodeOutput(nodeId, preTransformOutput);
                        },
                        redo: () => {
                            useCanvasStore.getState().updateNodeOutput(nodeId, transformedContent);
                        },
                    },
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : strings.errors.aiError;
                toast.error(message);
            } finally {
                setIsTransforming(false);
            }
        },
        [getKBContext, getPoolContext]
    );

    return {
        transformNodeContent,
        isTransforming,
    };
}

export type { TransformationType };
