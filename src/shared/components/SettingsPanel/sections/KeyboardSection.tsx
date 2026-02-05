/**
 * Keyboard Shortcuts Section
 */
import { strings } from '@/shared/localization/strings';
import styles from '../SettingsPanel.module.css';

interface ShortcutItem {
    action: string;
    keys: string;
}

const shortcuts: ShortcutItem[] = [
    { action: strings.shortcuts.openSettings, keys: '⌘ ,' },
    { action: strings.shortcuts.addNode, keys: 'N' },
    { action: strings.shortcuts.deleteNode, keys: 'Delete' },
];

export function KeyboardSection() {
    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.keyboard}</h3>
            <div className={styles.shortcutList}>
                {shortcuts.map((shortcut) => (
                    <div key={shortcut.action} className={styles.shortcutItem}>
                        <span className={styles.shortcutAction}>{shortcut.action}</span>
                        <kbd className={styles.shortcutKeys}>{shortcut.keys}</kbd>
                    </div>
                ))}
            </div>
        </div>
    );
}
