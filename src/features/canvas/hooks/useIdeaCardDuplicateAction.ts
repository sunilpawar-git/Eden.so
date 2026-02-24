/**
 * useIdeaCardDuplicateAction — Dedicated hook for IdeaCard duplicate action.
 * Extracted per SRP to keep useIdeaCardActions under the 75-line hook limit.
 */
import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function useIdeaCardDuplicateAction(nodeId: string) {
    const handleDuplicate = useCallback(() => {
        const newId = useCanvasStore.getState().duplicateNode(nodeId);
        if (newId) {
            toast.success(strings.nodeUtils.duplicateSuccess);
        } else {
            toast.error(strings.nodeUtils.duplicateError);
        }
    }, [nodeId]);

    return { handleDuplicate };
}
