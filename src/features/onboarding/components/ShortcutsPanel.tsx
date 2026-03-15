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
            <div
                className="fixed inset-0 bg-black/40 z-[var(--z-modal)] flex items-end justify-end p-6"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className="fixed bottom-6 right-6 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] min-w-[320px] max-w-[400px] overflow-hidden z-[calc(var(--z-modal)+1)]"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={strings.onboarding.shortcutsPanelTitle}
                data-testid="shortcuts-panel"
            >
                <div className="flex items-center justify-between py-4 px-6 border-b border-[var(--color-border)]">
                    <h2 className="text-[var(--color-text-primary)] text-[var(--font-size-md)] font-semibold m-0">{strings.onboarding.shortcutsPanelTitle}</h2>
                    <button className="bg-transparent border-none text-[var(--color-text-muted)] text-[var(--font-size-sm)] cursor-pointer p-0.5 leading-none hover:text-[var(--color-text-secondary)]" onClick={onClose} type="button" aria-label="Close">
                        ✕
                    </button>
                </div>

                <ul className="list-none py-2 px-6 m-0 flex flex-col">
                    {SHORTCUT_ROWS.map((row) => (
                        <li key={row.action} className="flex items-center justify-between py-1 border-b border-[var(--color-border)] last:border-b-0">
                            <span className="text-[var(--color-text-secondary)] text-[var(--font-size-sm)]">{row.action}</span>
                            <kbd className="text-[var(--color-text-muted)] text-[var(--font-size-xs)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm py-0.5 px-1 font-[inherit]">{row.keys}</kbd>
                        </li>
                    ))}
                </ul>

                <div className="py-4 px-6 border-t border-[var(--color-border)]">
                    <button
                        className="bg-transparent border-none text-[var(--color-primary)] text-[var(--font-size-sm)] cursor-pointer p-0 hover:underline"
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
