/**
 * useNodeImageUpload — Binds uploadNodeImage to the current auth/workspace context
 * Returns a stable callback for use with useImageInsert
 */
import { useCallback } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { uploadNodeImage } from '../services/imageUploadService';
import type { ImageUploadFn } from './useImageInsert';

export function useNodeImageUpload(nodeId: string): ImageUploadFn {
    return useCallback(async (file: File): Promise<string> => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) {
            throw new Error('Authentication or workspace context unavailable');
        }
        return uploadNodeImage(userId, workspaceId, nodeId, file);
    }, [nodeId]);
}
