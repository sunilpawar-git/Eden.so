/**
 * Appearance Section - Theme swatch picker and compact mode toggle
 */
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type ThemeOption } from '@/shared/stores/settingsStore';
import panelStyles from '../SettingsPanel.module.css';
import styles from './AppearanceSection.module.css';

interface ThemeSwatchConfig {
    value: ThemeOption;
    label: string;
}

const THEME_SWATCHES: readonly ThemeSwatchConfig[] = [
    { value: 'light', label: strings.settings.themeLight },
    { value: 'dark', label: strings.settings.themeDark },
    { value: 'sepia', label: strings.settings.themeSepia },
    { value: 'grey', label: strings.settings.themeGrey },
    { value: 'darkBlack', label: strings.settings.themeDarkBlack },
    { value: 'system', label: strings.settings.themeSystem },
];

export function AppearanceSection() {
    const theme = useSettingsStore((state) => state.theme);
    const setTheme = useSettingsStore((state) => state.setTheme);
    const compactMode = useSettingsStore((state) => state.compactMode);
    const toggleCompactMode = useSettingsStore((state) => state.toggleCompactMode);

    return (
        <div className={panelStyles.section}>
            <h3 className={panelStyles.sectionTitle}>{strings.settings.theme}</h3>
            <div className={styles.themeSwatchGrid}>
                {THEME_SWATCHES.map((swatch) => (
                    <label
                        key={swatch.value}
                        className={`${styles.themeSwatch} ${theme === swatch.value ? styles.themeSwatchActive : ''}`}
                    >
                        <input
                            type="radio"
                            name="theme"
                            value={swatch.value}
                            checked={theme === swatch.value}
                            onChange={() => setTheme(swatch.value)}
                            className={styles.themeSwatchInput}
                            aria-label={swatch.label}
                        />
                        <span
                            className={styles.themeSwatchPreview}
                            data-swatch={swatch.value}
                        >
                            <span
                                className={styles.themeSwatchAccent}
                                data-swatch={swatch.value}
                            />
                        </span>
                        <span className={styles.themeSwatchLabel}>{swatch.label}</span>
                    </label>
                ))}
            </div>

            <h3 className={panelStyles.sectionTitle}>{strings.settings.compactMode}</h3>
            <label className={panelStyles.toggleLabel}>
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
