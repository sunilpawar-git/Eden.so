/**
 * KnowledgeBankEntryEditor — Inline editor for KB entry title, content, and tags
 */
import { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_CONTENT_SIZE, KB_MAX_TITLE_LENGTH } from '../types/knowledgeBank';
import { KBTagInput } from './KBTagInput';

import styles from './KnowledgeBankPanel.module.css';

interface KnowledgeBankEntryEditorProps {
    initialTitle: string;
    initialContent: string;
    initialTags?: string[];
    onSave: (title: string, content: string, tags: string[]) => void;
    onCancel: () => void;
}

export function KnowledgeBankEntryEditor({
    initialTitle, initialContent, initialTags, onSave, onCancel
}: KnowledgeBankEntryEditorProps) {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [tags, setTags] = useState<string[]>(initialTags ?? []);

    const handleSave = useCallback(() => {
        if (!title.trim()) return;
        onSave(title.trim(), content, tags);
    }, [title, content, tags, onSave]);

    return (
        <div className={`${styles.entryCard} ${styles.entryEditing}`}>
            <input
                className={styles.editInput}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={strings.knowledgeBank.titlePlaceholder}
                maxLength={KB_MAX_TITLE_LENGTH}
            />
            <textarea
                className={styles.editTextarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={KB_MAX_CONTENT_SIZE}
            />
            <KBTagInput tags={tags} onChange={setTags} />
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
