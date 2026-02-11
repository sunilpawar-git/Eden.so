/**
 * useIdeaCardActions - Extracted action callbacks for IdeaCard
 * Reduces IdeaCard component size by encapsulating side-effect handlers
 */
import { useCallback, useRef, useEffect } from 'react';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useNodeTransformation, type TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { FOCUS_NODE_EVENT, type FocusNodeEvent } from './useQuickCapture';

interface UseIdeaCardActionsOptions {
    nodeId: string;
    getEditableContent: () => string;
    contentRef: React.RefObject<HTMLDivElement | null>;
}

/** Encapsulates delete, copy, regenerate, transform, connect, tags, scroll, and focus handlers */
export function useIdeaCardActions(options: UseIdeaCardActionsOptions) {
    const { nodeId, getEditableContent, contentRef } = options;
    const { deleteNode, updateNodeHeading, updateNodeTags } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { transformNodeContent, isTransforming } = useNodeTransformation();

    const handleDelete = useCallback(() => deleteNode(nodeId), [nodeId, deleteNode]);
    const handleRegenerate = useCallback(() => generateFromPrompt(nodeId), [nodeId, generateFromPrompt]);
    const handleConnectClick = useCallback(() => { void branchFromNode(nodeId); }, [nodeId, branchFromNode]);
    const handleTransform = useCallback((type: TransformationType) => {
        void transformNodeContent(nodeId, type);
    }, [nodeId, transformNodeContent]);

    const handleHeadingChange = useCallback((h: string) => {
        updateNodeHeading(nodeId, h);
    }, [nodeId, updateNodeHeading]);

    const handleCopy = useCallback(async () => {
        try {
            const text = contentRef.current?.innerText ?? getEditableContent();
            await navigator.clipboard.writeText(text);
            toast.success(strings.nodeUtils.copySuccess);
        } catch {
            toast.error(strings.nodeUtils.copyError);
        }
    }, [getEditableContent, contentRef]);

    const handleTagsChange = useCallback((ids: string[]) => {
        updateNodeTags(nodeId, ids);
    }, [nodeId, updateNodeTags]);

    // Wheel stop propagation for scrollable content
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const h = (e: WheelEvent) => e.stopPropagation();
        el.addEventListener('wheel', h, { passive: false });
        return () => el.removeEventListener('wheel', h);
    }, [contentRef]);

    // Focus node event listener
    useEffect(() => {
        const h = (e: Event) => {
            if ((e as FocusNodeEvent).detail.nodeId === nodeId) {
                useCanvasStore.getState().startEditing(nodeId);
            }
        };
        window.addEventListener(FOCUS_NODE_EVENT, h);
        return () => window.removeEventListener(FOCUS_NODE_EVENT, h);
    }, [nodeId]);

    return {
        handleDelete, handleRegenerate, handleConnectClick, handleTransform,
        handleHeadingChange, handleCopy, handleTagsChange, isTransforming,
    };
}
