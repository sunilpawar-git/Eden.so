/**
 * InlineSlashMenu - Inline slash command menu (renders inside card)
 * Replaces portal-based SlashCommandMenu with in-card dropdown
 * Supports filtering, keyboard navigation, and click selection
 */
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { strings } from '@/shared/localization/strings';
import { filterCommands } from '../../services/slashCommands';
import type { SlashCommandId } from '../../types/slashCommand';
import styles from './InlineSlashMenu.module.css';

interface InlineSlashMenuProps {
    /** Query text after "/" for filtering commands */
    query: string;
    /** Called when a command is selected */
    onSelect: (id: SlashCommandId) => void;
    /** Called when menu should close */
    onClose: () => void;
}

export const InlineSlashMenu = React.memo(({
    query,
    onSelect,
    onClose,
}: InlineSlashMenuProps) => {
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const filteredCommands = useMemo(() => filterCommands(query), [query]);

    // Reset highlight when filtered results change
    useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredCommands.length]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedIndex(prev =>
                        Math.min(prev + 1, filteredCommands.length - 1)
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredCommands[highlightedIndex]) {
                        onSelect(filteredCommands[highlightedIndex].id);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [filteredCommands, highlightedIndex, onSelect, onClose]);

    const handleCommandClick = useCallback((id: SlashCommandId) => {
        onSelect(id);
    }, [onSelect]);

    return (
        <div
            className={styles.inlineMenu}
            role="menu"
            aria-label={strings.slashCommands.menuLabel}
            data-testid="inline-slash-menu"
        >
            {filteredCommands.length === 0 ? (
                <div className={styles.noResults}>
                    {strings.slashCommands.noResults}
                </div>
            ) : (
                filteredCommands.map((cmd, index) => (
                    <button
                        key={cmd.id}
                        className={styles.menuItem}
                        role="menuitem"
                        data-highlighted={index === highlightedIndex}
                        onClick={() => handleCommandClick(cmd.id)}
                    >
                        <span className={styles.icon}>{cmd.icon}</span>
                        <div className={styles.commandInfo}>
                            <span className={styles.label}>
                                {cmd.prefix}
                            </span>
                            <span className={styles.prefixHint}>
                                Press Enter
                            </span>
                        </div>
                    </button>
                ))
            )}
        </div>
    );
});
