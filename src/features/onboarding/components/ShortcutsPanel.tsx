/**
 * ShortcutsPanel — keyboard cheat sheet with replay walkthrough link.
 * Portal-rendered; dismissed by Escape or close button.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { strings } from '@/shared/localization/strings';
import { formatShortcut } from '@/shared/utils/platform';
import styles from './ShortcutsPanel.module.css';

interface ShortcutsPanelProps {
    readonly onClose:  () => void;
    readonly onReplay: () => void;
}

interface ShortcutRow {
    action: string;
    keys:   string;
}

// Built once at module load — platform never changes mid-session
const SHORTCUT_ROWS: readonly ShortcutRow[] = [
    { action: strings.shortcuts.addNode,       keys: 'N' },
    { action: strings.shortcuts.search,        keys: formatShortcut('K') },
    { action: strings.shortcuts.quickCapture,  keys: formatShortcut('N') },
    { action: strings.shortcuts.deleteNode,    keys: 'Delete / Backspace' },
    { action: strings.shortcuts.clearSelection, keys: 'Escape' },
    { action: strings.shortcuts.undo,          keys: formatShortcut('Z') },
    { action: strings.shortcuts.redo,          keys: formatShortcut('Shift + Z') },
    { action: strings.shortcuts.openSettings,  keys: formatShortcut(',') },
];

export const ShortcutsPanel = React.memo(function ShortcutsPanel({
    onClose,
    onReplay,
}: ShortcutsPanelProps) {
    useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, onClose);

    return createPortal(
        <>
            {/* Backdrop: visual overlay, click-to-close, hidden from AT */}
            <div
                className={styles.overlay}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className={styles.panel}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={strings.onboarding.shortcutsPanelTitle}
                data-testid="shortcuts-panel"
            >
                <div className={styles.header}>
                    <h2 className={styles.title}>{strings.onboarding.shortcutsPanelTitle}</h2>
                    <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close">
                        ✕
                    </button>
                </div>

                <ul className={styles.list}>
                    {SHORTCUT_ROWS.map((row) => (
                        <li key={row.action} className={styles.row}>
                            <span className={styles.action}>{row.action}</span>
                            <kbd className={styles.keys}>{row.keys}</kbd>
                        </li>
                    ))}
                </ul>

                <div className={styles.footer}>
                    <button
                        className={styles.replayBtn}
                        onClick={onReplay}
                        type="button"
                        data-testid="replay-btn"
                    >
                        {strings.onboarding.replayWalkthrough}
                    </button>
                </div>
            </div>
        </>,
        document.body,
    );
});
