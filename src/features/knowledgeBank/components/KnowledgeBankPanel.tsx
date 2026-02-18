/**
 * KnowledgeBankPanel — Slide-out panel for managing KB entries
 * Slides from left edge, non-blocking (canvas remains visible)
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useKnowledgeBankStore, filterEntries } from '../stores/knowledgeBankStore';
import { updateKBEntry, deleteKBEntry } from '../services/knowledgeBankService';
import { deleteKBFile } from '../services/storageService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { KnowledgeBankEntryCard } from './KnowledgeBankEntryCard';
import { KBSearchBar } from './KBSearchBar';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import styles from './KnowledgeBankPanel.module.css';

export function KnowledgeBankPanel() {
    const isPanelOpen = useKnowledgeBankStore((s) => s.isPanelOpen);
    const entries = useKnowledgeBankStore((s) => s.entries);
    const setPanelOpen = useKnowledgeBankStore((s) => s.setPanelOpen);
    const searchQuery = useKnowledgeBankStore((s) => s.searchQuery);
    const typeFilter = useKnowledgeBankStore((s) => s.typeFilter);
    const selectedTag = useKnowledgeBankStore((s) => s.selectedTag);
    const summarizingEntryIds = useKnowledgeBankStore((s) => s.summarizingEntryIds);
    const kb = strings.knowledgeBank;

    // Derive filtered entries from stable state (avoids infinite re-render)
    const filteredEntries = useMemo(
        () => filterEntries(entries, searchQuery, typeFilter, selectedTag),
        [entries, searchQuery, typeFilter, selectedTag]
    );

    useEscapeClose(isPanelOpen, () => setPanelOpen(false));

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

    if (!isPanelOpen) return null;

    const isFiltering = searchQuery.trim().length > 0 || typeFilter !== 'all' || selectedTag !== null;
    const showEmpty = entries.length === 0;
    const showNoResults = !showEmpty && isFiltering && filteredEntries.length === 0;

    return (
        <div className={styles.panel}>
            <PanelHeader onClose={() => setPanelOpen(false)} />
            {entries.length > 0 && <KBSearchBar />}
            <div className={styles.panelEntries}>
                {showEmpty && <EmptyState />}
                {showNoResults && <NoResultsState />}
                {filteredEntries.map((entry) => (
                    <KnowledgeBankEntryCard
                        key={entry.id}
                        entry={entry}
                        isSummarizing={summarizingEntryIds.includes(entry.id)}
                        onToggle={handleToggle}
                        onPin={handlePin}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                ))}
            </div>
        </div>
    );
}

/** Hook: close on Escape key */
function useEscapeClose(active: boolean, onClose: () => void) {
    useEffect(() => {
        if (!active) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [active, onClose]);
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

/** Sub-component: no search results */
function NoResultsState() {
    return (
        <div className={styles.emptyState}>
            <p className={styles.emptyText}>{strings.knowledgeBank.search.noResults}</p>
        </div>
    );
}
