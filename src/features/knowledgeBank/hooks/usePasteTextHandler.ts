/**
 * usePasteTextHandler — Handles paste-text-to-KB flow
 * Extracted from KnowledgeBankAddButton to respect line limits
 */
import { useCallback } from 'react';
import { addKBEntry } from '../services/knowledgeBankService';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';

export function usePasteTextHandler(onSuccess: () => void) {
    const kb = strings.knowledgeBank;

    return useCallback(
        async (title: string, content: string) => {
            const userId = useAuthStore.getState().user?.id;
            const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
            if (!userId || !workspaceId) return;

            try {
                const entry = await addKBEntry(userId, workspaceId, {
                    type: 'text',
                    title,
                    content,
                });
                useKnowledgeBankStore.getState().addEntry(entry);
                onSuccess();
                toast.success(kb.saveEntry);
            } catch (error) {
                const msg = error instanceof Error
                    ? error.message
                    : kb.errors.saveFailed;
                toast.error(msg);
            }
        },
        [kb.errors.saveFailed, kb.saveEntry, onSuccess]
    );
}
