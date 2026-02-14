/**
 * KnowledgeBankPanel — Slide-out panel for managing KB entries
 * Slides from left edge, non-blocking (canvas remains visible)
 */
import { useCallback, useEffect } from 'react';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import { updateKBEntry, deleteKBEntry } from '../services/knowledgeBankService';
import { deleteKBFile } from '../services/storageService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { KnowledgeBankEntryCard } from './KnowledgeBankEntryCard';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import styles from './KnowledgeBankPanel.module.css';

export function KnowledgeBankPanel() {
    const isPanelOpen = useKnowledgeBankStore((s) => s.isPanelOpen);
    const entries = useKnowledgeBankStore((s) => s.entries);
    const setPanelOpen = useKnowledgeBankStore((s) => s.setPanelOpen);
    const kb = strings.knowledgeBank;

    useEffect(() => {
        if (!isPanelOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPanelOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isPanelOpen, setPanelOpen]);

    const handleToggle = useCallback((entryId: string) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        useKnowledgeBankStore.getState().toggleEntry(entryId);
        const entry = useKnowledgeBankStore.getState().entries.find((e) => e.id === entryId);
        if (entry) {
            void updateKBEntry(userId, workspaceId, entryId, { enabled: entry.enabled });
        }
    }, []);

    const handleUpdate = useCallback((entryId: string, { title, content }: { title: string; content: string }) => {
        const userId = useAuthStore.getState().user?.id;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!userId || !workspaceId) return;

        useKnowledgeBankStore.getState().updateEntry(entryId, { title, content });
        void updateKBEntry(userId, workspaceId, entryId, { title, content });
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

    if (!isPanelOpen) return null;

    return (
        <div className={styles.panel}>
            <PanelHeader onClose={() => setPanelOpen(false)} />
            <div className={styles.panelEntries}>
                {entries.length === 0 ? (
                    <EmptyState />
                ) : (
                    entries.map((entry) => (
                        <KnowledgeBankEntryCard
                            key={entry.id}
                            entry={entry}
                            onToggle={handleToggle}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

/** Sub-component: panel header */
function PanelHeader({ onClose }: { onClose: () => void }) {
    return (
        <div className={styles.panelHeader}>
            <h4 className={styles.panelTitle}>{strings.knowledgeBank.title}</h4>
            <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label={strings.settings.close}
            >
                &times;
            </button>
        </div>
    );
}

/** Sub-component: empty state */
function EmptyState() {
    const kb = strings.knowledgeBank;
    return (
        <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📚</div>
            <p className={styles.emptyText}>{kb.emptyState}</p>
            <p className={styles.emptyHint}>{kb.emptyStateDescription}</p>
        </div>
    );
}
