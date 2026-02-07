/**
 * CommandPrefixPill - Locked prefix indicator for active slash command
 * Shows "✨ /ai:" as a non-editable pill badge left of the textarea
 */
import React, { useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import type { SlashCommand } from '../../types/slashCommand';
import styles from './CommandPrefixPill.module.css';

interface CommandPrefixPillProps {
    /** The active command to display */
    command: SlashCommand;
    /** Called when user dismisses the prefix (e.g. backspace past it) */
    onDeactivate: () => void;
}

export const CommandPrefixPill = React.memo(({
    command,
    onDeactivate,
}: CommandPrefixPillProps) => {
    const handleDismiss = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onDeactivate();
    }, [onDeactivate]);

    return (
        <span
            className={styles.prefixPill}
            data-testid="command-prefix-pill"
        >
            <span className={styles.icon}>{command.icon}</span>
            <span className={styles.prefix}>
                /{command.prefix}{strings.slashCommands.prefixSeparator}
            </span>
            <button
                className={styles.dismiss}
                onClick={handleDismiss}
                aria-label={`${strings.slashCommands.prefixLabel} - deactivate`}
                type="button"
            >
                ×
            </button>
        </span>
    );
});
