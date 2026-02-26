/**
 * ToolbarSection — Settings section for configuring dual-deck toolbar layout.
 * Users toggle actions between Bar 1 and Bar 2 with a simple arrow button.
 */
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ALL_ACTION_IDS, MIN_ACTIONS_PER_DECK, countActionsPerDeck } from '@/features/canvas/types/utilsBarLayout';
import type { UtilsBarActionId, UtilsBarDeck } from '@/features/canvas/types/utilsBarLayout';
import styles from '../SettingsPanel.module.css';
import toolbarStyles from './ToolbarSection.module.css';

const ACTION_LABELS: Record<UtilsBarActionId, string> = {
    ai: strings.nodeUtils.aiActions,
    connect: strings.nodeUtils.connect,
    copy: strings.nodeUtils.copy,
    pin: strings.nodeUtils.pin,
    delete: strings.nodeUtils.delete,
    tags: strings.nodeUtils.tags,
    image: strings.nodeUtils.image,
    duplicate: strings.nodeUtils.duplicate,
    focus: strings.nodeUtils.focus,
    collapse: strings.nodeUtils.collapse,
    color: strings.nodeUtils.color,
    share: strings.nodeUtils.share,
};

const ACTION_ICONS: Record<UtilsBarActionId, string> = {
    ai: '✨', connect: '🔗', copy: '📋', pin: '📌', delete: '🗑️',
    tags: '🏷️', image: '🖼️', duplicate: '📑', focus: '🔍', collapse: '▾', color: '🎨', share: '📤',
};

export function ToolbarSection() {
    const layout = useSettingsStore((s) => s.utilsBarLayout);
    const setDeck = useSettingsStore((s) => s.setUtilsBarActionDeck);
    const reset = useSettingsStore((s) => s.resetUtilsBarLayout);
    const counts = countActionsPerDeck(layout);

    const renderColumn = (deck: UtilsBarDeck, title: string) => {
        const actions = ALL_ACTION_IDS.filter((id) => layout[id] === deck);
        const otherDeck: UtilsBarDeck = deck === 1 ? 2 : 1;
        const canMoveOut = (deck === 1 ? counts.deck1 : counts.deck2) > MIN_ACTIONS_PER_DECK;
        const moveLabel = otherDeck === 1 ? strings.settings.toolbarMoveToBar1 : strings.settings.toolbarMoveToBar2;

        return (
            <div className={toolbarStyles.column}>
                <h4 className={toolbarStyles.columnTitle}>{title}</h4>
                <ul className={toolbarStyles.actionList}>
                    {actions.map((id) => (
                        <li key={id} className={toolbarStyles.actionRow}>
                            <span className={toolbarStyles.actionIcon}>{ACTION_ICONS[id]}</span>
                            <span className={toolbarStyles.actionLabel}>{ACTION_LABELS[id]}</span>
                            <button
                                className={toolbarStyles.moveButton}
                                onClick={() => setDeck(id, otherDeck)}
                                disabled={!canMoveOut}
                                aria-label={`${moveLabel}: ${ACTION_LABELS[id]}`}
                                title={canMoveOut ? moveLabel : strings.settings.toolbarMinWarning}
                            >
                                {otherDeck === 2 ? '→' : '←'}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{strings.settings.toolbarLayout}</h3>
            <div className={toolbarStyles.columns}>
                {renderColumn(1, strings.settings.toolbarBar1)}
                {renderColumn(2, strings.settings.toolbarBar2)}
            </div>
            <button className={toolbarStyles.resetButton} onClick={reset}>
                {strings.settings.toolbarReset}
            </button>
        </div>
    );
}
