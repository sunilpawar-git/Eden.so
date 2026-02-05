/**
 * Appearance Section - Theme settings
 */
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type ThemeOption } from '@/shared/stores/settingsStore';
import styles from '../SettingsPanel.module.css';

export function AppearanceSection() {
    const theme = useSettingsStore((state) => state.theme);
    const setTheme = useSettingsStore((state) => state.setTheme);
    const compactMode = useSettingsStore((state) => state.compactMode);
    const toggleCompactMode = useSettingsStore((state) => state.toggleCompactMode);

    const themeOptions: Array<{ value: ThemeOption; label: string }> = [
        { value: 'light', label: strings.settings.themeLight },
        { value: 'dark', label: strings.settings.themeDark },
        { value: 'system', label: strings.settings.themeSystem },
    ];

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.theme}</h3>
            <div className={styles.optionGroup}>
                {themeOptions.map((option) => (
                    <label key={option.value} className={styles.radioLabel}>
                        <input
                            type="radio"
                            name="theme"
                            value={option.value}
                            checked={theme === option.value}
                            onChange={() => setTheme(option.value)}
                            aria-label={option.label}
                        />
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>

            <h3 className={styles.sectionTitle}>{strings.settings.compactMode}</h3>
            <label className={styles.toggleLabel}>
                <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={toggleCompactMode}
                />
                <span>{strings.settings.compactMode}</span>
            </label>
        </div>
    );
}
