/**
 * TagInput Component - Add/remove tags on nodes
 * BASB: Organize and categorize captured ideas
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useTagStore } from '../stores/tagStore';
import { strings } from '@/shared/localization/strings';
import styles from './TagInput.module.css';

interface TagInputProps {
    selectedTagIds: string[];
    onChange: (tagIds: string[]) => void;
    compact?: boolean;
}

export function TagInput({ selectedTagIds, onChange, compact = false }: TagInputProps) {
    const [isInputVisible, setIsInputVisible] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    
    const tags = useTagStore((state) => state.tags);
    const addTag = useTagStore((state) => state.addTag);
    const getTagByName = useTagStore((state) => state.getTagByName);

    const selectedTags = selectedTagIds
        .map((id) => tags.find((t) => t.id === id))
        .filter(Boolean);

    const handleAddClick = useCallback(() => {
        setIsInputVisible(true);
    }, []);

    useEffect(() => {
        if (isInputVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isInputVisible]);

    const handleInputKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsInputVisible(false);
                setInputValue('');
            } else if (e.key === 'Enter' && inputValue.trim()) {
                // Find or create tag
                const tag = getTagByName(inputValue) ?? addTag(inputValue);
                if (tag && !selectedTagIds.includes(tag.id)) {
                    onChange([...selectedTagIds, tag.id]);
                }
                setInputValue('');
                setIsInputVisible(false);
            }
        },
        [inputValue, getTagByName, addTag, selectedTagIds, onChange]
    );

    const handleRemoveTag = useCallback(
        (tagId: string) => {
            onChange(selectedTagIds.filter((id) => id !== tagId));
        },
        [selectedTagIds, onChange]
    );

    return (
        <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
            {selectedTags.map((tag) => (
                tag && (
                    <span
                        key={tag.id}
                        className={styles.tag}
                        style={{ backgroundColor: tag.color }}
                    >
                        <span className={styles.tagName}>{tag.name}</span>
                        <button
                            className={styles.removeButton}
                            onClick={() => handleRemoveTag(tag.id)}
                            aria-label={`${strings.tags.removeTag} ${tag.name}`}
                        >
                            ×
                        </button>
                    </span>
                )
            ))}

            {isInputVisible ? (
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={() => {
                        setIsInputVisible(false);
                        setInputValue('');
                    }}
                    placeholder={strings.tags.placeholder}
                />
            ) : (
                <button
                    className={styles.addButton}
                    onClick={handleAddClick}
                    aria-label={strings.tags.addTag}
                >
                    +
                </button>
            )}
        </div>
    );
}
