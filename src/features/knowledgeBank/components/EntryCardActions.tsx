/**
 * EntryCardActions — Edit / delete action buttons for a KB entry card
 * Extracted sub-component to keep KnowledgeBankEntryCard under line limit
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { EditIcon, TrashIcon } from '@/shared/components/icons';
import styles from './KnowledgeBankPanel.module.css';

interface EntryCardActionsProps {
    entryId: string;
    onEdit: () => void;
    onDelete: (entryId: string) => void;
}

export const EntryCardActions = React.memo(function EntryCardActions({
    entryId, onEdit, onDelete,
}: EntryCardActionsProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const kb = strings.knowledgeBank;

    const handleDelete = useCallback(() => {
        if (isDeleting) {
            onDelete(entryId);
        } else {
            setIsDeleting(true);
        }
    }, [isDeleting, onDelete, entryId]);

    if (isDeleting) {
        return (
            <div className={styles.entryActions}>
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
            </div>
        );
    }

    return (
        <div className={styles.entryActions}>
            <button
                className={styles.actionButton}
                onClick={onEdit}
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
        </div>
    );
});
