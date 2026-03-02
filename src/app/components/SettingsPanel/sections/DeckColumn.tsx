/**
 * DeckColumn — Renders one column of toolbar actions with drag handles and move arrows.
 * Used by ToolbarSection for Bar 1 and Bar 2 configuration.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { MIN_ACTIONS_PER_DECK } from '@/features/canvas/types/utilsBarLayout';
import type { UtilsBarActionId, UtilsBarDeck } from '@/features/canvas/types/utilsBarLayout';
import type { ToolbarDragHandlers } from './useToolbarDrag';
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
    pool: strings.nodePool.addToPool,
};

const ACTION_ICONS: Record<UtilsBarActionId, string> = {
    ai: '✨', connect: '🔗', copy: '📋', pin: '📌', delete: '🗑️',
    tags: '🏷️', image: '🖼️', duplicate: '📑', focus: '🔍', collapse: '▾', color: '🎨', share: '📤', pool: '🧠',
};

interface DeckColumnProps {
    deck: UtilsBarDeck;
    title: string;
    actions: UtilsBarActionId[];
    drag: ToolbarDragHandlers;
}

export const DeckColumn = React.memo(function DeckColumn({
    deck,
    title,
    actions,
    drag,
}: DeckColumnProps) {
    const otherDeck: UtilsBarDeck = deck === 1 ? 2 : 1;
    const canMoveOut = actions.length > MIN_ACTIONS_PER_DECK;
    const moveLabel = otherDeck === 1 ? strings.settings.toolbarMoveToBar1 : strings.settings.toolbarMoveToBar2;

    return (
        <div className={toolbarStyles.column}>
            <h4 className={toolbarStyles.columnTitle}>{title}</h4>
            <ul className={toolbarStyles.actionList}>
                {actions.map((id, index) => {
                    const isDragging = drag.draggedId === id;
                    const isDropTarget = drag.dropTargetId === id;
                    const rowCls = [
                        toolbarStyles.actionRow,
                        isDragging ? toolbarStyles.actionRowDragging : '',
                        isDropTarget ? toolbarStyles.actionRowDropTarget : '',
                    ].join(' ');

                    return (
                        <li
                            key={id}
                            className={rowCls}
                            draggable
                            onDragStart={drag.handleDragStart(id)}
                            onDragOver={drag.handleDragOver(id, deck, index)}
                            onDrop={drag.handleDrop(id, deck, index)}
                            onDragEnd={drag.handleDragEnd}
                        >
                            <span
                                className={toolbarStyles.dragHandle}
                                data-testid="drag-handle"
                                aria-hidden="true"
                            >
                                ⋮⋮
                            </span>
                            <span className={toolbarStyles.actionIcon}>{ACTION_ICONS[id]}</span>
                            <span className={toolbarStyles.actionLabel}>{ACTION_LABELS[id]}</span>
                            <button
                                className={toolbarStyles.moveButton}
                                onClick={() => useSettingsStore.getState().setUtilsBarActionDeck(id, otherDeck)}
                                disabled={!canMoveOut}
                                aria-label={`${moveLabel}: ${ACTION_LABELS[id]}`}
                                title={canMoveOut ? moveLabel : strings.settings.toolbarMinWarning}
                            >
                                {otherDeck === 2 ? '→' : '←'}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
});
