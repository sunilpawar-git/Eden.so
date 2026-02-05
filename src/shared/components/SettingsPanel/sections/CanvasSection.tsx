/**
 * Canvas Section - Canvas-related settings
 */
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import styles from '../SettingsPanel.module.css';

export function CanvasSection() {
    const canvasGrid = useSettingsStore((state) => state.canvasGrid);
    const toggleCanvasGrid = useSettingsStore((state) => state.toggleCanvasGrid);
    const autoSave = useSettingsStore((state) => state.autoSave);
    const setAutoSave = useSettingsStore((state) => state.setAutoSave);

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.canvasGrid}</h3>
            <label className={styles.toggleLabel}>
                <input
                    type="checkbox"
                    checked={canvasGrid}
                    onChange={toggleCanvasGrid}
                />
                <span>{strings.settings.canvasGrid}</span>
            </label>

            <h3 className={styles.sectionTitle}>{strings.settings.autoSave}</h3>
            <label className={styles.toggleLabel}>
                <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={() => setAutoSave(!autoSave)}
                />
                <span>{strings.settings.autoSave}</span>
            </label>
        </div>
    );
}
