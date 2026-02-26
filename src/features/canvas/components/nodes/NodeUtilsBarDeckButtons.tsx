/**
 * NodeUtilsBarDeckButtons — Renders action buttons for a single deck.
 * Maps every UtilsBarActionId to the correct component (TooltipButton or AIOrTransform).
 * Memoized per CLAUDE.md performance rules.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBarAIOrTransform } from './NodeUtilsBarAIOrTransform';
import { TooltipButton } from './TooltipButton';
import type { UtilsBarActionId } from '../../types/utilsBarLayout';
import type { NodeUtilsBarProps } from './NodeUtilsBar.types';
import type { useNodeUtilsBar } from '../../hooks/useNodeUtilsBar';
import buttonStyles from './TooltipButton.module.css';

interface DeckButtonsProps {
    actions: UtilsBarActionId[];
    props: NodeUtilsBarProps;
    bar: ReturnType<typeof useNodeUtilsBar>;
}

interface RenderContext {
    p: NodeUtilsBarProps;
    bar: DeckButtonsProps['bar'];
    disabled: boolean;
    placement: 'right';
}

function renderDeck1Action(id: UtilsBarActionId, ctx: RenderContext): React.ReactNode {
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

function renderDeck2Action(id: UtilsBarActionId, ctx: RenderContext): React.ReactNode {
    const { p, bar, disabled, placement } = ctx;
    switch (id) {
        case 'tags':
            return (
                <TooltipButton key={id} label={strings.nodeUtils.tags} tooltipText={strings.nodeUtils.tags}
                    icon="🏷️" onClick={p.onTagClick} disabled={disabled} tooltipPlacement={placement} />
            );
        case 'image':
            return p.onImageClick ? (
                <TooltipButton key={id} label={strings.nodeUtils.image} tooltipText={strings.nodeUtils.image}
                    icon="🖼️" onClick={p.onImageClick} disabled={disabled} tooltipPlacement={placement} />
            ) : null;
        case 'duplicate':
            return p.onDuplicateClick ? (
                <TooltipButton key={id} label={strings.nodeUtils.duplicate} tooltipText={strings.nodeUtils.duplicate}
                    icon="📑" onClick={p.onDuplicateClick} disabled={disabled} tooltipPlacement={placement} />
            ) : null;
        case 'focus':
            return p.onFocusClick ? (
                <TooltipButton key={id} label={strings.nodeUtils.focus} tooltipText={strings.nodeUtils.focus}
                    shortcut={strings.nodeUtils.focusShortcut} icon="🔍" onClick={p.onFocusClick}
                    disabled={disabled} tooltipPlacement={placement} />
            ) : null;
        case 'collapse': {
            if (!p.onCollapseToggle) return null;
            const label = (p.isCollapsed ?? false) ? strings.nodeUtils.expand : strings.nodeUtils.collapse;
            const icon = (p.isCollapsed ?? false) ? '▴' : '▾';
            return (
                <TooltipButton key={id} label={label} tooltipText={label}
                    shortcut={strings.nodeUtils.collapseShortcut} icon={icon}
                    onClick={p.onCollapseToggle} disabled={disabled} tooltipPlacement={placement} />
            );
        }
        case 'color':
            return p.onColorChange ? (
                <TooltipButton key={id} label={strings.nodeUtils.color} tooltipText={strings.nodeUtils.color}
                    icon="🎨" onClick={bar.handleColorToggle} disabled={disabled} tooltipPlacement={placement} />
            ) : null;
        case 'share':
            return p.onShareClick ? (
                <TooltipButton key={id} label={strings.nodeUtils.share} tooltipText={strings.nodeUtils.share}
                    icon="↗️" onClick={bar.handleShareToggle} disabled={disabled} tooltipPlacement={placement} />
            ) : null;
        default: return null;
    }
}

function renderAction(id: UtilsBarActionId, ctx: RenderContext): React.ReactNode {
    return renderDeck1Action(id, ctx) ?? renderDeck2Action(id, ctx);
}

export const NodeUtilsBarDeckButtons = React.memo(function NodeUtilsBarDeckButtons({ actions, props, bar }: DeckButtonsProps) {
    const ctx: RenderContext = { p: props, bar, disabled: props.disabled ?? false, placement: 'right' };
    return <>{actions.map((id) => renderAction(id, ctx))}</>;
});
