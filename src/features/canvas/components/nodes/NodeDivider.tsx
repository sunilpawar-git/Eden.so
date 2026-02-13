/**
 * NodeDivider - Grey separator between heading and body content
 * Shared by all node types (replaces inline .divider in AICardContent)
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import styles from './IdeaCard.module.css';

export const NodeDivider = React.memo(() => (
    <div
        className={styles.divider}
        data-testid="node-divider"
        role="separator"
        aria-label={strings.ideaCard.dividerLabel}
    />
));
