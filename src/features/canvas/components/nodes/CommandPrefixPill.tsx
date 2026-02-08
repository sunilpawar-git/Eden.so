/**
 * CommandPrefixPill - Locked prefix indicator for active slash command
 * Shows icon + label as a compact inline chip with esc hint
 * Deactivation via Backspace (empty input) or Escape key
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import type { SlashCommand } from '../../types/slashCommand';
import styles from './CommandPrefixPill.module.css';

interface CommandPrefixPillProps {
    /** The active command to display */
    command: SlashCommand;
}

export const CommandPrefixPill = React.memo(({
    command,
}: CommandPrefixPillProps) => (
    <span
        className={styles.prefixPill}
        data-testid="command-prefix-pill"
    >
        <span className={styles.icon}>{command.icon}</span>
        <span className={styles.label}>
            {strings.slashCommands.aiGenerate.label}
        </span>
        <kbd className={styles.escHint}>esc</kbd>
    </span>
));
