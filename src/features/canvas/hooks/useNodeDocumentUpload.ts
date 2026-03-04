/**
 * useNodeDocumentUpload — Binds uploadDocumentArtifacts to the current auth/workspace context.
 * Returns a stable DocumentUploadFn for use with useDocumentInsert.
 */
import { useCallback } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { uploadDocumentArtifacts } from '../services/documentUploadService';
import type { DocumentUploadFn } from '../services/documentInsertService';
import { strings } from '@/shared/localization/strings';

export function useNodeDocumentUpload(nodeId: string): DocumentUploadFn {
    return useCallback(async (file, parsedText, thumbnailBlob) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) {
            throw new Error(strings.canvas.docAuthUnavailable);
        }
        return uploadDocumentArtifacts(userId, workspaceId, nodeId, file, parsedText, thumbnailBlob);
    }, [nodeId]);
}
