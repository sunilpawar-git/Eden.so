/**
 * KBTagInput — Reusable tag input with add/remove pill UI
 * Used in KnowledgeBankEntryEditor for editing tags on an entry
 */
import React, { useState, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { KB_MAX_TAGS_PER_ENTRY, KB_MAX_TAG_LENGTH } from '../types/knowledgeBank';
import styles from './KBTagInput.module.css';

interface KBTagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
}

export const KBTagInput = React.memo(function KBTagInput({ tags, onChange }: KBTagInputProps) {
    const [input, setInput] = useState('');
    const ts = strings.knowledgeBank.tags;

    const addTag = useCallback(() => {
        const trimmed = input.trim().toLowerCase();
        if (!trimmed) return;
        if (trimmed.length > KB_MAX_TAG_LENGTH) return;
        if (tags.length >= KB_MAX_TAGS_PER_ENTRY) return;
        if (tags.includes(trimmed)) return;
        onChange([...tags, trimmed]);
        setInput('');
    }, [input, tags, onChange]);

    const removeTag = useCallback((tag: string) => {
        onChange(tags.filter((t) => t !== tag));
    }, [tags, onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    }, [addTag]);

    const atLimit = tags.length >= KB_MAX_TAGS_PER_ENTRY;

    return (
        <div className={styles.tagInput}>
            <div className={styles.tagList}>
                {tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                        {tag}
                        <button
                            className={styles.tagRemove}
                            onClick={() => removeTag(tag)}
                            aria-label={`${ts.removeTag} ${tag}`}
                        >
                            &times;
                        </button>
                    </span>
                ))}
            </div>
            {!atLimit && (
                <input
                    type="text"
                    className={styles.tagField}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={ts.placeholder}
                    maxLength={KB_MAX_TAG_LENGTH}
                    aria-label={ts.addTag}
                />
            )}
            {atLimit && (
                <span className={styles.tagLimit}>{ts.maxReached}</span>
            )}
        </div>
    );
});
