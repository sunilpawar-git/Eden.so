/**
 * KnowledgeBankEntryCard — Single entry card in the KB panel
 * Shows title, content preview, toggle, edit/delete actions
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import {
    FileTextIcon, ImageIcon, EditIcon, TrashIcon,
} from '@/shared/components/icons';
import { KnowledgeBankEntryEditor } from './KnowledgeBankEntryEditor';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';
import styles from './KnowledgeBankPanel.module.css';

interface KnowledgeBankEntryCardProps {
    entry: KnowledgeBankEntry;
    onToggle: (entryId: string) => void;
    onUpdate: (entryId: string, { title, content }: { title: string; content: string }) => void;
    onDelete: (entryId: string) => void;
}

export const KnowledgeBankEntryCard = React.memo(function KnowledgeBankEntryCard({
    entry, onToggle, onUpdate, onDelete,
}: KnowledgeBankEntryCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const kb = strings.knowledgeBank;

    const handleDelete = useCallback(() => {
        if (isDeleting) {
            onDelete(entry.id);
        } else {
            setIsDeleting(true);
        }
    }, [isDeleting, onDelete, entry.id]);

    const handleSave = useCallback((title: string, content: string) => {
        onUpdate(entry.id, { title, content });
        setIsEditing(false);
    }, [entry.id, onUpdate]);

    if (isEditing) {
        return (
            <KnowledgeBankEntryEditor
                initialTitle={entry.title}
                initialContent={entry.content}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <div className={`${styles.entryCard} ${!entry.enabled ? styles.disabled : ''}`}>
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
                        {entry.type === 'image' ? <ImageIcon size={16} /> : <FileTextIcon size={16} />}
                    </span>
                    <h4 className={styles.entryTitle} title={entry.title}>
                        {entry.title}
                    </h4>
                </div>
            </div>
            <p className={styles.entryPreview}>{entry.content.slice(0, 120)}</p>
            <div className={styles.entryActions}>
                {isDeleting ? (
                    <>
                        <span className={styles.confirmText}>{kb.deleteConfirm}</span>
                        <button
                            className={`${styles.actionButton} ${styles.deleteAction}`}
                            onClick={handleDelete}
                            autoFocus
                        >
                            {strings.common.confirm}
                        </button>
                        <button
                            className={styles.actionButton}
                            onClick={() => setIsDeleting(false)}
                        >
                            {strings.common.cancel}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className={styles.actionButton}
                            onClick={() => setIsEditing(true)}
                            aria-label={kb.editEntry}
                        >
                            <EditIcon size={16} />
                        </button>
                        <button
                            className={`${styles.actionButton} ${styles.deleteAction}`}
                            onClick={handleDelete}
                            aria-label={kb.deleteEntry}
                        >
                            <TrashIcon size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});
