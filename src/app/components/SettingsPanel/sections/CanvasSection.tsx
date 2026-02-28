/**
 * Canvas Section - Canvas display, scroll mode, connector style, and auto-save settings
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore, type CanvasScrollMode } from '@/shared/stores/settingsStore';
import { Toggle } from '@/shared/components/Toggle';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { ConnectorStylePicker } from './ConnectorStylePicker';
import styles from '../SettingsPanel.module.css';

const SCROLL_MODE_OPTIONS = [
    { value: 'zoom' as CanvasScrollMode, label: strings.settings.canvasScrollZoom },
    { value: 'navigate' as CanvasScrollMode, label: strings.settings.canvasScrollNavigate },
] as const;

export const CanvasSection = React.memo(function CanvasSection() {
    const canvasGrid = useSettingsStore((s) => s.canvasGrid);
    const canvasFreeFlow = useSettingsStore((s) => s.canvasFreeFlow);
    const autoSave = useSettingsStore((s) => s.autoSave);
    const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval);
    const canvasScrollMode = useSettingsStore((s) => s.canvasScrollMode);
    const connectorStyle = useSettingsStore((s) => s.connectorStyle);

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.canvasDisplay}</h3>
            <Toggle
                id="canvas-grid"
                checked={canvasGrid}
                onChange={() => useSettingsStore.getState().toggleCanvasGrid()}
                label={strings.settings.canvasGrid}
            />
            <Toggle
                id="canvas-free-flow"
                checked={canvasFreeFlow}
                onChange={() => useSettingsStore.getState().toggleCanvasFreeFlow()}
                label={strings.settings.freeFlow}
            />

            <h3 className={styles.sectionTitle}>{strings.settings.canvasScrollMode}</h3>
            <SegmentedControl
                name="canvasScrollMode"
                label={strings.settings.canvasScrollMode}
                options={SCROLL_MODE_OPTIONS}
                value={canvasScrollMode}
                onChange={(v) => useSettingsStore.getState().setCanvasScrollMode(v)}
            />

            <h3 className={styles.sectionTitle}>{strings.settings.connectorStyle}</h3>
            <ConnectorStylePicker
                value={connectorStyle}
                onChange={(v) => useSettingsStore.getState().setConnectorStyle(v)}
            />

            <h3 className={styles.sectionTitle}>{strings.settings.autoSave}</h3>
            <Toggle
                id="canvas-auto-save"
                checked={autoSave}
                onChange={() => {
                    const s = useSettingsStore.getState();
                    s.setAutoSave(!s.autoSave);
                }}
                label={strings.settings.autoSave}
            />

            {autoSave && (
                <div className={styles.sliderGroup}>
                    <input
                        type="range"
                        min={10}
                        max={300}
                        step={10}
                        value={autoSaveInterval}
                        onChange={(e) => useSettingsStore.getState().setAutoSaveInterval(Number(e.target.value))}
                        aria-label={strings.settings.autoSaveInterval}
                    />
                    <span className={styles.sliderValue}>
                        {autoSaveInterval} {strings.settings.seconds}
                    </span>
                </div>
            )}
        </div>
    );
});
