/**
 * Appearance Section - Theme swatch picker and compact mode toggle
 */
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type ThemeOption } from '@/shared/stores/settingsStore';
import styles from '../SettingsPanel.module.css';

interface ThemeSwatchConfig {
    value: ThemeOption;
    label: string;
    /** CSS background for swatch preview */
    previewBg: string;
    /** CSS color for accent dot in swatch */
    previewAccent: string;
}

const THEME_SWATCHES: readonly ThemeSwatchConfig[] = [
    {
        value: 'light',
        label: strings.settings.themeLight,
        previewBg: 'hsl(0, 0%, 100%)',
        previewAccent: 'hsl(220, 65%, 50%)',
    },
    {
        value: 'dark',
        label: strings.settings.themeDark,
        previewBg: 'hsl(220, 13%, 9%)',
        previewAccent: 'hsl(220, 70%, 60%)',
    },
    {
        value: 'sepia',
        label: strings.settings.themeSepia,
        previewBg: 'hsl(36, 40%, 95%)',
        previewAccent: 'hsl(28, 55%, 45%)',
    },
    {
        value: 'grey',
        label: strings.settings.themeGrey,
        previewBg: 'hsl(0, 0%, 92%)',
        previewAccent: 'hsl(210, 15%, 45%)',
    },
    {
        value: 'darkBlack',
        label: strings.settings.themeDarkBlack,
        previewBg: 'hsl(0, 0%, 0%)',
        previewAccent: 'hsl(220, 75%, 62%)',
    },
    {
        value: 'system',
        label: strings.settings.themeSystem,
        previewBg: 'linear-gradient(135deg, hsl(0,0%,100%) 50%, hsl(220,13%,9%) 50%)',
        previewAccent: 'hsl(220, 65%, 50%)',
    },
];

export function AppearanceSection() {
    const theme = useSettingsStore((state) => state.theme);
    const setTheme = useSettingsStore((state) => state.setTheme);
    const compactMode = useSettingsStore((state) => state.compactMode);
    const toggleCompactMode = useSettingsStore((state) => state.toggleCompactMode);

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.theme}</h3>
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
                            style={{ background: swatch.previewBg }}
                        >
                            <span
                                className={styles.themeSwatchAccent}
                                style={{ background: swatch.previewAccent }}
                            />
                        </span>
                        <span className={styles.themeSwatchLabel}>{swatch.label}</span>
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
