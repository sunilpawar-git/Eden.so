/**
 * useIdeaCardShareAction — Dedicated hook for IdeaCard share action.
 * Manages async share state (loading flag to prevent double submissions).
 * Extracted per SRP alongside useIdeaCardDuplicateAction.
 *
 * Uses a ref for the in-flight guard so handleShare keeps a stable identity
 * (avoids breaking React.memo on NodeUtilsBar / ShareMenu on 500+ node canvases).
 */
import { useState, useCallback, useRef } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { shareNodeToWorkspace } from '../services/nodeShareService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function useIdeaCardShareAction(nodeId: string) {
    const [isSharing, setIsSharing] = useState(false);
    const sharingRef = useRef(false);

    const handleShare = useCallback(async (targetWorkspaceId: string) => {
        if (sharingRef.current) return;
        sharingRef.current = true;
        setIsSharing(true);
        try {
            const userId = useAuthStore.getState().user?.id;
            if (!userId) throw new Error('Not authenticated');

            const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId);
            if (!node) throw new Error('Node not found');

            await shareNodeToWorkspace(userId, node, targetWorkspaceId);
            toast.success(strings.nodeUtils.shareSuccess);
        } catch (error) {
            console.error('Share failed:', error);
            toast.error(strings.nodeUtils.shareError);
        } finally {
            sharingRef.current = false;
            setIsSharing(false);
        }
    }, [nodeId]);

    return { handleShare, isSharing };
}
