/**
 * KBDocumentGroup — Collapsible card for a grouped document (parent + children)
 * Shows document title, parts count, expand/collapse, and group-level actions
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { FileTextIcon, ChevronDownIcon } from '@/shared/components/icons';
import { KnowledgeBankEntryCard } from './KnowledgeBankEntryCard';
import { getDisplayTitle } from '../services/documentGrouper';
import type { DocumentGroup } from '../types/knowledgeBank';
import styles from './KBDocumentGroup.module.css';

interface KBDocumentGroupProps {
    group: DocumentGroup;
    summarizingEntryIds: string[];
    onToggleGroup: (parentId: string) => void;
    onDeleteGroup: (parentId: string) => void;
    onToggle: (entryId: string) => void;
    onPin: (entryId: string) => void;
    onUpdate: (entryId: string, u: { title: string; content: string; tags: string[] }) => void;
    onDelete: (entryId: string) => void;
}

export const KBDocumentGroup = React.memo(function KBDocumentGroup({
    group, summarizingEntryIds,
    onToggleGroup, onDeleteGroup,
    onToggle, onPin, onUpdate, onDelete,
}: KBDocumentGroupProps) {
    const [isExpanded, setExpanded] = useState(false);
    const kb = strings.knowledgeBank;
    const displayTitle = getDisplayTitle(group.parent);
    const isGroupEnabled = group.parent.enabled;

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleGroup(group.parent.id);
    }, [group.parent.id, onToggleGroup]);

    const handleExpandToggle = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    const handleDelete = useCallback(() => {
        onDeleteGroup(group.parent.id);
    }, [group.parent.id, onDeleteGroup]);

    return (
        <div className={`${styles.groupCard} ${!isGroupEnabled ? styles.groupDisabled : ''}`}>
            <div className={styles.groupHeader} onClick={handleExpandToggle}>
                <input
                    type="checkbox"
                    checked={isGroupEnabled}
                    onClick={handleToggle}
                    onChange={() => undefined}
                    className={styles.checkbox}
                    aria-label={kb.documentGroup.toggleAll}
                />
                <span className={styles.docIcon} aria-hidden="true">
                    <FileTextIcon size={16} />
                </span>
                <h4 className={styles.groupTitle} title={displayTitle}>
                    {displayTitle}
                </h4>
                <span className={styles.partsBadge}>
                    {group.totalParts} {kb.documentGroup.partsCount}
                </span>
                <button
                    className={`${styles.expandButton} ${isExpanded ? styles.expandButtonOpen : ''}`}
                    aria-label={isExpanded ? kb.documentGroup.collapse : kb.documentGroup.expand}
                >
                    <ChevronDownIcon size={12} />
                </button>
            </div>
            {group.parent.summary && !isExpanded && (
                <p className={styles.summaryPreview}>{group.parent.summary}</p>
            )}
            <div className={styles.groupActions}>
                <button className={styles.deleteButton} onClick={handleDelete}>
                    {kb.documentGroup.deleteDocument}
                </button>
            </div>
            {isExpanded && (
                <div className={styles.childrenList}>
                    {[group.parent, ...group.children].map((entry) => (
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
            )}
        </div>
    );
});
