/**
 * Keyboard Shortcuts Section - Platform-aware shortcut display
 */
import { strings } from '@/shared/localization/strings';
import { formatShortcut } from '@/shared/utils/platform';
import styles from '../SettingsPanel.module.css';

interface ShortcutItem {
    action: string;
    keys: string;
}

/** Static shortcut list — built once at module load (platform never changes mid-session) */
const SHORTCUTS: readonly ShortcutItem[] = [
    { action: strings.shortcuts.openSettings, keys: formatShortcut(',') },
    { action: strings.shortcuts.addNode, keys: 'N' },
    { action: strings.shortcuts.quickCapture, keys: formatShortcut('N') },
    { action: strings.shortcuts.deleteNode, keys: 'Delete / Backspace' },
    { action: strings.shortcuts.clearSelection, keys: 'Escape' },
];

export function KeyboardSection() {

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.keyboard}</h3>
            <div className={styles.shortcutList}>
                {SHORTCUTS.map((shortcut) => (
                    <div key={shortcut.action} className={styles.shortcutItem}>
                        <span className={styles.shortcutAction}>{shortcut.action}</span>
                        <kbd className={styles.shortcutKeys}>{shortcut.keys}</kbd>
                    </div>
                ))}
            </div>
        </div>
    );
}
