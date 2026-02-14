/**
 * KnowledgeBankEntryEditor — Inline editor for KB entry title + content
 */
import { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_CONTENT_SIZE } from '../types/knowledgeBank';

import styles from './KnowledgeBankPanel.module.css';

interface KnowledgeBankEntryEditorProps {
    initialTitle: string;
    initialContent: string;
    onSave: (title: string, content: string) => void;
    onCancel: () => void;
}

export function KnowledgeBankEntryEditor({
    initialTitle, initialContent, onSave, onCancel
}: KnowledgeBankEntryEditorProps) {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);

    const handleSave = useCallback(() => {
        if (!title.trim()) return;
        onSave(title.trim(), content);
    }, [title, content, onSave]);

    return (
        <div className={`${styles.entryCard} ${styles.entryEditing}`}>
            <input
                className={styles.editInput}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={strings.knowledgeBank.titlePlaceholder}
                maxLength={100}
            />
            <textarea
                className={styles.editTextarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={KB_MAX_CONTENT_SIZE}
            />
            <div className={styles.editCharCount}>
                {content.length} / {KB_MAX_CONTENT_SIZE.toLocaleString()}
            </div>
            <div className={styles.editActions}>
                <button className={styles.editCancelButton} onClick={onCancel}>
                    {strings.common.cancel}
                </button>
                <button
                    className={styles.editSaveButton}
                    onClick={handleSave}
                    disabled={!title.trim()}
                >
                    {strings.common.save}
                </button>
            </div>
        </div>
    );
}
