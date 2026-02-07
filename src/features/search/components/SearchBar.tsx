/**
 * SearchBar Component - Global search for notes
 * BASB: Quick retrieval of captured ideas
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';
import { strings } from '@/shared/localization/strings';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    onResultClick?: (nodeId: string, workspaceId: string) => void;
}

// eslint-disable-next-line max-lines-per-function -- search bar with dropdown logic
export function SearchBar({ onResultClick }: SearchBarProps) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { results, search, clear } = useSearch();

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInputValue(value);
            search(value);
            setIsOpen(value.length > 0);
        },
        [search]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                setInputValue('');
                clear();
                setIsOpen(false);
            }
        },
        [clear]
    );

    const handleResultClick = useCallback(
        (nodeId: string, workspaceId: string) => {
            onResultClick?.(nodeId, workspaceId);
            setInputValue('');
            clear();
            setIsOpen(false);
        },
        [onResultClick, clear]
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.searchContainer} ref={inputRef}>
            <input
                type="text"
                className={styles.searchInput}
                placeholder={strings.search.placeholder}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => inputValue && setIsOpen(true)}
            />
            <span className={styles.searchIcon}>🔍</span>

            {isOpen && results.length > 0 && (
                <div className={styles.resultsDropdown}>
                    {results.map((result, index) => (
                        <button
                            key={`${result.nodeId}-${result.matchType}-${index}`}
                            className={styles.resultItem}
                            onClick={() => handleResultClick(result.nodeId, result.workspaceId)}
                        >
                            <span className={styles.resultContent}>{result.matchedContent}</span>
                            <span className={styles.resultMeta}>
                                {result.matchType === 'prompt' ? strings.search.prompt : strings.search.output}
                                {' · '}
                                {result.workspaceName}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && inputValue && results.length === 0 && (
                <div className={styles.resultsDropdown}>
                    <div className={styles.noResults}>{strings.search.noResults}</div>
                </div>
            )}
        </div>
    );
}
