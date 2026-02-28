/**
 * Canvas Section - Canvas grid, auto-save, and scroll mode settings
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type CanvasScrollMode, type ConnectorStyle } from '@/shared/stores/settingsStore';
import styles from '../SettingsPanel.module.css';

interface ScrollModeOption {
    value: CanvasScrollMode;
    label: string;
}

interface ConnectorStyleOption {
    value: ConnectorStyle;
    label: string;
}

const SCROLL_MODE_OPTIONS: readonly ScrollModeOption[] = [
    { value: 'zoom', label: strings.settings.canvasScrollZoom },
    { value: 'navigate', label: strings.settings.canvasScrollNavigate },
];

const CONNECTOR_STYLE_OPTIONS: readonly ConnectorStyleOption[] = [
    { value: 'solid', label: strings.settings.connectorSolid },
    { value: 'subtle', label: strings.settings.connectorSubtle },
    { value: 'thick', label: strings.settings.connectorThick },
    { value: 'dashed', label: strings.settings.connectorDashed },
    { value: 'dotted', label: strings.settings.connectorDotted },
];

export const CanvasSection = React.memo(function CanvasSection() {
    const canvasGrid = useSettingsStore((state) => state.canvasGrid);
    const canvasFreeFlow = useSettingsStore((state) => state.canvasFreeFlow);
    const autoSave = useSettingsStore((state) => state.autoSave);
    const canvasScrollMode = useSettingsStore((state) => state.canvasScrollMode);
    const connectorStyle = useSettingsStore((state) => state.connectorStyle);

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.canvasGrid}</h3>
            <label className={styles.toggleLabel}>
                <input
                    type="checkbox"
                    checked={canvasGrid}
                    onChange={() => useSettingsStore.getState().toggleCanvasGrid()}
                />
                <span>{strings.settings.canvasGrid}</span>
            </label>

            <label className={styles.toggleLabel}>
                <input
                    type="checkbox"
                    checked={canvasFreeFlow}
                    onChange={() => useSettingsStore.getState().toggleCanvasFreeFlow()}
                />
                <span>{strings.settings.freeFlow}</span>
            </label>

            <h3 className={styles.sectionTitle}>{strings.settings.canvasScrollMode}</h3>
            <div className={styles.optionGroup}>
                {SCROLL_MODE_OPTIONS.map((option) => (
                    <label key={option.value} className={styles.radioLabel}>
                        <input
                            type="radio"
                            name="canvasScrollMode"
                            value={option.value}
                            checked={canvasScrollMode === option.value}
                            onChange={() => useSettingsStore.getState().setCanvasScrollMode(option.value)}
                            aria-label={option.label}
                        />
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>

            <h3 className={styles.sectionTitle}>{strings.settings.connectorStyle}</h3>
            <div className={styles.optionGroup}>
                {CONNECTOR_STYLE_OPTIONS.map((option) => (
                    <label key={option.value} className={styles.radioLabel}>
                        <input
                            type="radio"
                            name="connectorStyle"
                            value={option.value}
                            checked={connectorStyle === option.value}
                            onChange={() => useSettingsStore.getState().setConnectorStyle(option.value)}
                            aria-label={option.label}
                        />
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>

            <h3 className={styles.sectionTitle}>{strings.settings.autoSave}</h3>
            <label className={styles.toggleLabel}>
                <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={() => useSettingsStore.getState().setAutoSave(!autoSave)}
                />
                <span>{strings.settings.autoSave}</span>
            </label>
        </div>
    );
});
