/**
 * useNodeTransformation Hook - AI-based content transformation
 * Provides transformation capabilities for IdeaCard nodes
 */
import { useCallback, useState } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { transformContent, type TransformationType } from '../services/geminiService';
import { useKnowledgeBankContext } from '@/features/knowledgeBank/hooks/useKnowledgeBankContext';

/**
 * Hook for transforming node content using AI
 * Supports: refine, shorten, lengthen, proofread
 */
export function useNodeTransformation() {
    const [isTransforming, setIsTransforming] = useState(false);
    const { updateNodeOutput } = useCanvasStore();
    const { getKBContext } = useKnowledgeBankContext();

    /**
     * Transform node content using the specified transformation type
     */
    const transformNodeContent = useCallback(
        async (nodeId: string, type: TransformationType) => {
            // Get fresh node data from store
            const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId);
            if (node?.type !== 'idea') return;

            const content = node.data.output;
            if (!content) return;

            setIsTransforming(true);

            try {
                const kbContext = getKBContext(content);
                const transformedContent = await transformContent(content, type, kbContext);
                updateNodeOutput(nodeId, transformedContent);
            } catch {
                // Error handling - preserve original content
                // Could integrate with error store in the future
            } finally {
                setIsTransforming(false);
            }
        },
        [updateNodeOutput, getKBContext]
    );

    return {
        transformNodeContent,
        isTransforming,
    };
}

export type { TransformationType };
