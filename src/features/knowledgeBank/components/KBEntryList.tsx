import { KnowledgeBankEntryCard } from './KnowledgeBankEntryCard';
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
}

export function KBEntryList({
    showEmpty,
    showNoResults,
    filteredEntries,
    summarizingEntryIds,
    onToggle,
    onPin,
    onUpdate,
    onDelete,
}: KBEntryListProps) {
    return (
        <div className={styles.panelEntries}>
            {showEmpty && <EmptyState />}
            {showNoResults && <NoResultsState />}
            {filteredEntries.map((entry) => (
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
