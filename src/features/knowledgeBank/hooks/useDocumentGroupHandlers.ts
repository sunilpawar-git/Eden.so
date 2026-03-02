/**
 * useDocumentGroupHandlers — Group-level toggle and delete for document chunks
 * Handles Firestore persistence and Storage cleanup for document groups
 */
import { useCallback } from 'react';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { updateKBEntryBatch, deleteKBEntryBatch } from '../services/knowledgeBankService';
import { deleteKBFile } from '../services/storageService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useConfirmStore } from '@/shared/stores/confirmStore';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function useDocumentGroupHandlers() {
    const handleToggleGroup = useCallback(async (parentId: string) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        useKnowledgeBankStore.getState().toggleDocumentGroup(parentId);

        const entries = useKnowledgeBankStore.getState().entries;
        const affected = entries.filter(
            (e) => e.id === parentId || e.parentEntryId === parentId
        );

        try {
            const updates = affected.map((e) => ({ entryId: e.id, enabled: e.enabled }));
            await updateKBEntryBatch(userId, workspaceId, updates);
        } catch (error) {
            console.error('KB group toggle persist failed', error);
            useKnowledgeBankStore.getState().toggleDocumentGroup(parentId);
            toast.error(strings.knowledgeBank.errors.saveFailed);
        }
    }, []);

    const handleDeleteGroup = useCallback(async (parentId: string) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        const kb = strings.knowledgeBank;
        const confirmed = await useConfirmStore.getState().confirm({
            title: kb.documentGroup.deleteDocument,
            message: kb.documentGroup.deleteDocumentConfirm,
            isDestructive: true,
        });
        if (!confirmed) return;

        const entries = useKnowledgeBankStore.getState().entries;
        const groupEntries = entries.filter(
            (e) => e.id === parentId || e.parentEntryId === parentId
        );
        const entryIds = groupEntries.map((e) => e.id);

        try {
            await deleteKBEntryBatch(userId, workspaceId, entryIds);
            useKnowledgeBankStore.getState().removeDocumentGroup(parentId);

            // Best-effort Storage cleanup after authoritative Firestore delete
            const withFile = groupEntries.filter(
                (e): e is typeof e & { originalFileName: string } => Boolean(e.originalFileName)
            );
            const storageCleanups = withFile.map((e) =>
                deleteKBFile(userId, workspaceId, e.id, e.originalFileName)
            );
            await Promise.allSettled(storageCleanups);
        } catch (error) {
            console.error('KB group delete failed', error);
            toast.error(kb.errors.deleteFailed);
        }
    }, []);

    return { handleToggleGroup, handleDeleteGroup };
}
