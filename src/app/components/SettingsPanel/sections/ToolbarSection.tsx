/**
 * ToolbarSection — Settings section for configuring dual-deck toolbar layout.
 * Supports drag-and-drop reordering within each bar and arrow-button
 * cross-bar switching. Drag state is managed by useToolbarDrag hook.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { DeckColumn } from './DeckColumn';
import { useToolbarDrag } from './useToolbarDrag';
import styles from '../SettingsPanel.module.css';
import toolbarStyles from './ToolbarSection.module.css';

export const ToolbarSection = React.memo(function ToolbarSection() {
    const deck1 = useSettingsStore((s) => s.utilsBarLayout.deck1);
    const deck2 = useSettingsStore((s) => s.utilsBarLayout.deck2);
    const drag = useToolbarDrag();

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.toolbarLayout}</h3>
            <div className={toolbarStyles.columns}>
                <DeckColumn deck={1} title={strings.settings.toolbarBar1} actions={deck1} drag={drag} />
                <DeckColumn deck={2} title={strings.settings.toolbarBar2} actions={deck2} drag={drag} />
            </div>
            <button
                className={toolbarStyles.resetButton}
                onClick={() => useSettingsStore.getState().resetUtilsBarLayout()}
            >
                {strings.settings.toolbarReset}
            </button>
        </div>
    );
});
