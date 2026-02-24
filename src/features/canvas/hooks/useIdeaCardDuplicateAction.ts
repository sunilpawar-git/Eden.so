/**
 * useIdeaCardDuplicateAction — Dedicated hook for IdeaCard duplicate action.
 * Extracted per SRP to keep useIdeaCardActions under the 75-line hook limit.
 * Pans to the new node after duplication so it is always visible.
 */
import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { usePanToNode } from './usePanToNode';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function useIdeaCardDuplicateAction(nodeId: string) {
    const { panToPosition } = usePanToNode();

    const handleDuplicate = useCallback(() => {
        const newId = useCanvasStore.getState().duplicateNode(nodeId);
        if (newId) {
            toast.success(strings.nodeUtils.duplicateSuccess);
            const newNode = useCanvasStore.getState().nodes.find((n) => n.id === newId);
            if (newNode) panToPosition(newNode.position.x, newNode.position.y);
        } else {
            toast.error(strings.nodeUtils.duplicateError);
        }
    }, [nodeId, panToPosition]);

    return { handleDuplicate };
}
