/**
 * KBSearchBar — Search input + type filter pills + tag filter for KB panel
 * Connects to store for search query, type filter, and tag filter state
 */
import React, { useCallback } from 'react';
import { useKnowledgeBankStore, extractAllTags } from '../stores/knowledgeBankStore';
import type { KBTypeFilter } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import styles from './KBSearchBar.module.css';

const TYPE_FILTERS: Array<{ value: KBTypeFilter; label: string }> = [
    { value: 'all', label: strings.knowledgeBank.search.filterAll },
    { value: 'text', label: strings.knowledgeBank.search.filterText },
    { value: 'image', label: strings.knowledgeBank.search.filterImage },
    { value: 'document', label: strings.knowledgeBank.search.filterDocument },
];

export const KBSearchBar = React.memo(function KBSearchBar() {
    const searchQuery = useKnowledgeBankStore((s) => s.searchQuery);
    const typeFilter = useKnowledgeBankStore((s) => s.typeFilter);
    const selectedTag = useKnowledgeBankStore((s) => s.selectedTag);
    const entries = useKnowledgeBankStore((s) => s.entries);
    const setSearchQuery = useKnowledgeBankStore((s) => s.setSearchQuery);
    const setTypeFilter = useKnowledgeBankStore((s) => s.setTypeFilter);
    const setSelectedTag = useKnowledgeBankStore((s) => s.setSelectedTag);

    const allTags = React.useMemo(() => extractAllTags(entries), [entries]);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchQuery(e.target.value);
        },
        [setSearchQuery]
    );

    const handleTagClick = useCallback(
        (tag: string) => {
            setSelectedTag(selectedTag === tag ? null : tag);
        },
        [selectedTag, setSelectedTag]
    );

    return (
        <div className={styles.searchBar}>
            <input
                type="text"
                className={styles.searchInput}
                placeholder={strings.knowledgeBank.search.placeholder}
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label={strings.knowledgeBank.search.placeholder}
            />
            <div className={styles.typeFilters}>
                {TYPE_FILTERS.map((f) => (
                    <button
                        key={f.value}
                        className={`${styles.filterPill} ${typeFilter === f.value ? styles.filterPillActive : ''}`}
                        onClick={() => setTypeFilter(f.value)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
            {allTags.length > 0 && (
                <TagFilterRow
                    tags={allTags}
                    selectedTag={selectedTag}
                    onTagClick={handleTagClick}
                />
            )}
        </div>
    );
});

/** Sub-component: tag filter pill row */
const TagFilterRow = React.memo(function TagFilterRow({
    tags, selectedTag, onTagClick,
}: { tags: string[]; selectedTag: string | null; onTagClick: (tag: string) => void }) {
    return (
        <div className={styles.tagFilters}>
            {tags.map((tag) => (
                <button
                    key={tag}
                    className={`${styles.tagPill} ${selectedTag === tag ? styles.tagPillActive : ''}`}
                    onClick={() => onTagClick(tag)}
                >
                    {tag}
                </button>
            ))}
        </div>
    );
});
