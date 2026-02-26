/**
 * useNodeTransformation Hook - AI-based content transformation
 * Provides transformation capabilities for IdeaCard nodes
 */
import { useCallback, useState } from 'react';
import { useCanvasStore, getNodeMap } from '@/features/canvas/stores/canvasStore';
import { transformContent, type TransformationType } from '../services/geminiService';
import { useKnowledgeBankContext } from '@/features/knowledgeBank/hooks/useKnowledgeBankContext';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';

/**
 * Hook for transforming node content using AI
 * Supports: refine, shorten, lengthen, proofread
 */
export function useNodeTransformation() {
    const [isTransforming, setIsTransforming] = useState(false);
    const { getKBContext } = useKnowledgeBankContext();

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

            setIsTransforming(true);

            try {
                const kbContext = getKBContext(content, 'transform');
                const transformedContent = await transformContent(content, type, kbContext);
                useCanvasStore.getState().updateNodeOutput(nodeId, transformedContent);
            } catch (error) {
                const message = error instanceof Error ? error.message : strings.errors.aiError;
                toast.error(message);
            } finally {
                setIsTransforming(false);
            }
        },
        [getKBContext]
    );

    return {
        transformNodeContent,
        isTransforming,
    };
}

export type { TransformationType };
