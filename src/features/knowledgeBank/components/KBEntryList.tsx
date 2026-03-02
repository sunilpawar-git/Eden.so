import { useMemo } from 'react';
import { KnowledgeBankEntryCard } from './KnowledgeBankEntryCard';
import { KBDocumentGroup } from './KBDocumentGroup';
import { groupEntriesByDocument } from '../services/documentGrouper';
import { strings } from '@/shared/localization/strings';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';
import styles from './KnowledgeBankPanel.module.css';

interface KBEntryListProps {
    showEmpty: boolean;
    showNoResults: boolean;
    filteredEntries: KnowledgeBankEntry[];
    summarizingEntryIds: string[];
    onToggle: (entryId: string) => void;
    onPin: (entryId: string) => void;
    onUpdate: (entryId: string, u: { title: string; content: string; tags: string[] }) => void;
    onDelete: (entryId: string) => void;
    onToggleGroup: (parentId: string) => void;
    onDeleteGroup: (parentId: string) => void;
}

export function KBEntryList({
    showEmpty, showNoResults, filteredEntries, summarizingEntryIds,
    onToggle, onPin, onUpdate, onDelete,
    onToggleGroup, onDeleteGroup,
}: KBEntryListProps) {
    const grouped = useMemo(
        () => groupEntriesByDocument(filteredEntries),
        [filteredEntries]
    );

    return (
        <div className={styles.panelEntries}>
            {showEmpty && <EmptyState />}
            {showNoResults && <NoResultsState />}
            {grouped.documents.map((group) => (
                <KBDocumentGroup
                    key={group.parent.id}
                    group={group}
                    summarizingEntryIds={summarizingEntryIds}
                    onToggleGroup={onToggleGroup}
                    onDeleteGroup={onDeleteGroup}
                    onToggle={onToggle}
                    onPin={onPin}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
            ))}
            {grouped.standalone.map((entry) => (
                <KnowledgeBankEntryCard
                    key={entry.id}
                    entry={entry}
                    isSummarizing={summarizingEntryIds.includes(entry.id)}
                    onToggle={onToggle}
                    onPin={onPin}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

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

function NoResultsState() {
    return (
        <div className={styles.emptyState}>
            <p className={styles.emptyText}>{strings.knowledgeBank.search.noResults}</p>
        </div>
    );
}
