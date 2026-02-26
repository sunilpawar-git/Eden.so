/**
 * KnowledgeBankPanel — Slide-out panel for managing KB entries
 * Slides from left edge, non-blocking (canvas remains visible)
 */
import { useEffect, useMemo } from 'react';
import { useKnowledgeBankStore, filterEntries } from '../stores/knowledgeBankStore';
import { useKnowledgeBankPanelHandlers } from '../hooks/useKnowledgeBankPanelHandlers';
import { KBSearchBar } from './KBSearchBar';
import { KBEntryList } from './KBEntryList';
import { strings } from '@/shared/localization/strings';
import styles from './KnowledgeBankPanel.module.css';

export function KnowledgeBankPanel() {
    const isPanelOpen = useKnowledgeBankStore((s) => s.isPanelOpen);
    const entries = useKnowledgeBankStore((s) => s.entries);
    const setPanelOpen = useKnowledgeBankStore((s) => s.setPanelOpen);
    const searchQuery = useKnowledgeBankStore((s) => s.searchQuery);
    const typeFilter = useKnowledgeBankStore((s) => s.typeFilter);
    const selectedTag = useKnowledgeBankStore((s) => s.selectedTag);
    const summarizingEntryIds = useKnowledgeBankStore((s) => s.summarizingEntryIds);
    const { handleToggle, handlePin, handleUpdate, handleDelete } = useKnowledgeBankPanelHandlers();

    const filteredEntries = useMemo(
        () => filterEntries(entries, searchQuery, typeFilter, selectedTag),
        [entries, searchQuery, typeFilter, selectedTag]
    );

    useEscapeClose(isPanelOpen, () => setPanelOpen(false));

    if (!isPanelOpen) return null;

    const isFiltering = searchQuery.trim().length > 0 || typeFilter !== 'all' || selectedTag !== null;
    const showEmpty = entries.length === 0;
    const showNoResults = !showEmpty && isFiltering && filteredEntries.length === 0;

    return (
        <div className={styles.panel}>
            <PanelHeader onClose={() => setPanelOpen(false)} />
            {entries.length > 0 && <KBSearchBar />}
            <KBEntryList
                showEmpty={showEmpty}
                showNoResults={showNoResults}
                filteredEntries={filteredEntries}
                summarizingEntryIds={summarizingEntryIds}
                onToggle={handleToggle}
                onPin={handlePin}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
            />
        </div>
    );
}

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

function PanelHeader({ onClose }: { onClose: () => void }) {
    return (
        <div className={styles.panelHeader}>
            <h4 className={styles.panelTitle}>{strings.knowledgeBank.title}</h4>
            <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label={strings.settings.close}
            >
                {strings.common.closeSymbol}
            </button>
        </div>
    );
}
