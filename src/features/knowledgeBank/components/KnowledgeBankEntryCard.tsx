/**
 * KnowledgeBankEntryCard — Single entry card in the KB panel
 * Shows title, content preview, toggle, edit/delete actions
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { FileTextIcon, ImageIcon } from '@/shared/components/icons';
import { KnowledgeBankEntryEditor } from './KnowledgeBankEntryEditor';
import { EntryCardActions } from './EntryCardActions';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';
import { KB_PREVIEW_LENGTH } from '../types/knowledgeBank';
import styles from './KnowledgeBankPanel.module.css';
import tagStyles from './KBEntryTags.module.css';

interface KnowledgeBankEntryCardProps {
    entry: KnowledgeBankEntry;
    isSummarizing?: boolean;
    onToggle: (entryId: string) => void;
    onUpdate: (entryId: string, u: { title: string; content: string; tags: string[] }) => void;
    onDelete: (entryId: string) => void;
}

export const KnowledgeBankEntryCard = React.memo(function KnowledgeBankEntryCard({
    entry, isSummarizing, onToggle, onUpdate, onDelete,
}: KnowledgeBankEntryCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const kb = strings.knowledgeBank;

    const handleSave = useCallback((title: string, content: string, tags: string[]) => {
        onUpdate(entry.id, { title, content, tags });
        setIsEditing(false);
    }, [entry.id, onUpdate]);

    if (isEditing) {
        return (
            <KnowledgeBankEntryEditor
                initialTitle={entry.title}
                initialContent={entry.content}
                initialTags={entry.tags}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <div className={`${styles.entryCard} ${!entry.enabled ? styles.entryDisabled : ''}`}>
            <div className={styles.cardHeader}>
                <div className={styles.entryTitleRow}>
                    <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={() => onToggle(entry.id)}
                        className={styles.checkbox}
                        aria-label={kb.toggleEntry}
                    />
                    <span className={styles.typeIcon} aria-hidden="true">
                        {entry.type === 'image'
                            ? <ImageIcon size={16} />
                            : <FileTextIcon size={16} />}
                    </span>
                    {entry.parentEntryId && (
                        <span className={styles.chunkBadge}>{kb.chunkBadge}</span>
                    )}
                    <h4 className={styles.entryTitle} title={entry.title}>
                        {entry.title}
                    </h4>
                </div>
            </div>
            {isSummarizing && (
                <p className={styles.summarizingBadge}>{kb.summarizing}</p>
            )}
            <p className={styles.entryPreview}>{entry.content.slice(0, KB_PREVIEW_LENGTH)}</p>
            {entry.tags && entry.tags.length > 0 && (
                <div className={tagStyles.entryTags}>
                    {entry.tags.map((tag) => (
                        <span key={tag} className={tagStyles.entryTagPill}>{tag}</span>
                    ))}
                </div>
            )}
            <EntryCardActions
                entryId={entry.id}
                onEdit={() => setIsEditing(true)}
                onDelete={onDelete}
            />
        </div>
    );
});
