/**
 * SlashCommandList - TipTap Suggestion popup renderer
 * Renders filtered slash commands with keyboard navigation via ref
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { strings } from '@/shared/localization/strings';
import type { SlashCommand } from '../../types/slashCommand';
import styles from './SlashCommandList.module.css';

interface SlashCommandListProps {
    items: SlashCommand[];
    command: (item: SlashCommand) => void;
}

export interface SlashCommandListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

function resolveKey(dotPath: string): string {
    const parts = dotPath.split('.');
    let current: unknown = strings;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') return dotPath;
        if (!Object.prototype.hasOwnProperty.call(current, part)) return dotPath;
        current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : dotPath;
}

export const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
    ({ items, command }, ref) => {
        const [selectedIndex, setSelectedIndex] = useState(0);
        const itemsRef = useRef(items);
        const commandRef = useRef(command);
        itemsRef.current = items;
        commandRef.current = command;

        useEffect(() => {
            setSelectedIndex(prev => (items.length === 0 ? 0 : Math.min(prev, items.length - 1)));
        }, [items.length]);

        const selectItem = (index: number) => {
            const item = itemsRef.current[index];
            if (item) commandRef.current(item);
        };

        useImperativeHandle(ref, () => ({
            onKeyDown: ({ event }) => {
                if (items.length === 0) return false;
                if (event.key === 'ArrowUp') {
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    return true;
                }
                if (event.key === 'ArrowDown') {
                    setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
                    return true;
                }
                if (event.key === 'Enter') {
                    selectItem(selectedIndex);
                    return true;
                }
                return false;
            },
        }), [items.length, selectedIndex]);

        const handleItemMouseDown = (e: React.MouseEvent, index: number) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedIndex(index);
            selectItem(index);
        };

        return (
            <div className={styles.slashMenu} role="menu"
                aria-label={strings.slashCommands.menuLabel}>
                {items.length === 0 ? (
                    <div className={styles.noResults}>
                        {strings.slashCommands.noResults}
                    </div>
                ) : (
                    items.map((cmd, index) => (
                        <button key={cmd.id} className={styles.menuItem}
                            role="menuitem" data-highlighted={index === selectedIndex}
                            onMouseDown={(e) => handleItemMouseDown(e, index)}>
                            <span className={styles.icon}>{cmd.icon}</span>
                            <span className={styles.labelGroup}>
                                <span className={styles.label}>{resolveKey(cmd.labelKey)}</span>
                                <span className={styles.description}>{resolveKey(cmd.descriptionKey)}</span>
                            </span>
                        </button>
                    ))
                )}
            </div>
        );
    }
);
