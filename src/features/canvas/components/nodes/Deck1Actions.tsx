/**
 * Deck1Actions — Renders Deck 1 action buttons for NodeUtilsBar.
 * Maps UtilsBarActionId to the correct component (TooltipButton or AIOrTransform).
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBarAIOrTransform } from './NodeUtilsBarAIOrTransform';
import { TooltipButton } from './TooltipButton';
import type { RenderContext } from './deckActionTypes';
import type { UtilsBarActionId } from '../../types/utilsBarLayout';
import buttonStyles from './TooltipButton.module.css';

export function renderDeck1Action(id: UtilsBarActionId, ctx: RenderContext): React.ReactNode {
    const { p, bar, disabled, placement } = ctx;
    switch (id) {
        case 'ai':
            return (
                <NodeUtilsBarAIOrTransform key={id}
                    onTransform={p.onTransform} isTransformOpen={bar.isTransformOpen}
                    onTransformToggle={bar.handleTransformToggle} onCloseSubmenu={bar.closeSubmenu}
                    onRegenerate={p.onRegenerate} disabled={disabled} hasContent={p.hasContent ?? false}
                    isTransforming={p.isTransforming ?? false} tooltipPlacement={placement} onAIClick={p.onAIClick} />
            );
        case 'connect':
            return (
                <TooltipButton key={id} label={strings.nodeUtils.connect} tooltipText={strings.nodeUtils.connect}
                    icon="🔗" onClick={p.onConnectClick} disabled={disabled} tooltipPlacement={placement} />
            );
        case 'copy':
            return p.onCopyClick ? (
                <TooltipButton key={id} label={strings.nodeUtils.copy} tooltipText={strings.nodeUtils.copy}
                    shortcut={strings.nodeUtils.copyShortcut} icon="📋" onClick={p.onCopyClick}
                    disabled={disabled || !(p.hasContent ?? false)} tooltipPlacement={placement} />
            ) : null;
        case 'pin': {
            if (!p.onPinToggle) return null;
            const pinLabel = (p.isPinned ?? false) ? strings.nodeUtils.unpin : strings.nodeUtils.pin;
            const pinIcon = (p.isPinned ?? false) ? '📍' : '📌';
            return (
                <TooltipButton key={id} label={pinLabel} tooltipText={pinLabel}
                    icon={pinIcon} onClick={p.onPinToggle} disabled={disabled} tooltipPlacement={placement} />
            );
        }
        case 'delete':
            return (
                <TooltipButton key={id} label={strings.nodeUtils.delete} tooltipText={strings.nodeUtils.delete}
                    shortcut={strings.nodeUtils.deleteShortcut} icon="🗑️" onClick={p.onDelete}
                    disabled={disabled} className={buttonStyles.deleteButton} tooltipPlacement={placement} />
            );
        default: return null;
    }
}
