import { useCallback } from 'react';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { updateKBEntry, deleteKBEntry } from '../services/knowledgeBankService';
import { deleteKBFile } from '../services/storageService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function useKnowledgeBankPanelHandlers() {
    const kb = strings.knowledgeBank;

    const handleToggle = useCallback((entryId: string) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        const current = useKnowledgeBankStore.getState().entries.find((e) => e.id === entryId);
        if (!current) return;
        const newEnabled = !current.enabled;

        useKnowledgeBankStore.getState().toggleEntry(entryId);
        void updateKBEntry(userId, workspaceId, entryId, { enabled: newEnabled });
    }, []);

    const handlePin = useCallback((entryId: string) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        const current = useKnowledgeBankStore.getState().entries.find((e) => e.id === entryId);
        if (!current) return;
        const newPinned = !current.pinned;

        if (newPinned) {
            useKnowledgeBankStore.getState().pinEntry(entryId);
        } else {
            useKnowledgeBankStore.getState().unpinEntry(entryId);
        }
        void updateKBEntry(userId, workspaceId, entryId, { pinned: newPinned });
    }, []);

    const handleUpdate = useCallback((entryId: string, updates: { title: string; content: string; tags: string[] }) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        useKnowledgeBankStore.getState().updateEntry(entryId, updates);
        void updateKBEntry(userId, workspaceId, entryId, updates);
    }, []);

    const handleDelete = useCallback(async (entryId: string) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        const entry = useKnowledgeBankStore.getState().entries.find((e) => e.id === entryId);
        try {
            if (entry?.originalFileName) {
                await deleteKBFile(userId, workspaceId, entryId, entry.originalFileName);
            }
            await deleteKBEntry(userId, workspaceId, entryId);
            useKnowledgeBankStore.getState().removeEntry(entryId);
        } catch {
            toast.error(kb.errors.deleteFailed);
        }
    }, [kb.errors.deleteFailed]);

    return { handleToggle, handlePin, handleUpdate, handleDelete };
}
