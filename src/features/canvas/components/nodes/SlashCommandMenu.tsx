/**
 * SlashCommandMenu - Dropdown menu for slash commands
 * Appears when user types "/" in IdeaCard textarea
 * Supports filtering, keyboard navigation, and click selection
 */
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { filterCommands } from '../../services/slashCommands';
import type { SlashCommandId } from '../../types/slashCommand';
import styles from './SlashCommandMenu.module.css';

interface SlashCommandMenuProps {
    /** Query text after "/" for filtering commands */
    query: string;
    /** Called when a command is selected */
    onSelect: (id: SlashCommandId) => void;
    /** Called when menu should close */
    onClose: () => void;
    /** Position anchor from textarea */
    anchorRect: DOMRect;
}

/**
 * Get localized label from string key path
 */
function getStringByKey(key: string): string {
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic key access
    let result: any = strings;
    for (const part of parts) {
        result = result?.[part];
    }
    return typeof result === 'string' ? result : key;
}

export const SlashCommandMenu = React.memo(({
    query,
    onSelect,
    onClose,
    anchorRect,
}: SlashCommandMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    // Filter commands based on query
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

    // Handle click outside
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        // Use capture phase to intercept event before React Flow stops propagation
        document.addEventListener('mousedown', handleMouseDown, true);
        return () => document.removeEventListener('mousedown', handleMouseDown, true);
    }, [onClose]);

    const handleCommandClick = useCallback((id: SlashCommandId) => {
        onSelect(id);
    }, [onSelect]);

    // Position menu below the anchor
    const menuStyle: React.CSSProperties = {
        top: `${anchorRect.bottom}px`,
        left: `${anchorRect.left}px`,
    };

    const menu = (
        <div
            ref={menuRef}
            className={styles.slashCommandMenu}
            role="menu"
            aria-label={strings.slashCommands.menuLabel}
            data-testid="slash-command-menu"
            style={menuStyle}
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
                                {getStringByKey(cmd.labelKey)}
                            </span>
                            <span className={styles.description}>
                                {getStringByKey(cmd.descriptionKey)}
                            </span>
                        </div>
                    </button>
                ))
            )}
        </div>
    );

    return createPortal(menu, document.body);
});
