/**
 * Deck2Actions — Renders Deck 2 action buttons for NodeUtilsBar.
 * Maps UtilsBarActionId to the correct component via a dispatch table,
 * keeping cyclomatic complexity low.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { TooltipButton } from './TooltipButton';
import { PoolAction } from './PoolAction';
import { ColorMenu } from './ColorMenu';
import { ShareMenu } from './ShareMenu';
import { normalizeNodeColorKey } from '../../types/node';
import type { RenderContext } from './deckActionTypes';
import type { UtilsBarActionId } from '../../types/utilsBarLayout';

type ActionRenderer = (ctx: RenderContext) => React.ReactNode | null;

const renderTags: ActionRenderer = ({ p, disabled, placement }) => (
    <TooltipButton key="tags" label={strings.nodeUtils.tags} tooltipText={strings.nodeUtils.tags}
        icon="🏷️" onClick={p.onTagClick} disabled={disabled} tooltipPlacement={placement} />
);

const renderImage: ActionRenderer = ({ p, disabled, placement }) => p.onImageClick ? (
    <TooltipButton key="image" label={strings.nodeUtils.image} tooltipText={strings.nodeUtils.image}
        icon="🖼️" onClick={p.onImageClick} disabled={disabled} tooltipPlacement={placement} />
) : null;

const renderAttachment: ActionRenderer = ({ p, disabled, placement }) => p.onAttachmentClick ? (
    <TooltipButton key="attachment" label={strings.nodeUtils.attachment}
        tooltipText={strings.nodeUtils.attachmentTooltip}
        icon="📎" onClick={p.onAttachmentClick} disabled={disabled} tooltipPlacement={placement} />
) : null;

const renderDuplicate: ActionRenderer = ({ p, disabled, placement }) => p.onDuplicateClick ? (
    <TooltipButton key="duplicate" label={strings.nodeUtils.duplicate} tooltipText={strings.nodeUtils.duplicate}
        icon="📑" onClick={p.onDuplicateClick} disabled={disabled} tooltipPlacement={placement} />
) : null;

const renderFocus: ActionRenderer = ({ p, disabled, placement }) => p.onFocusClick ? (
    <TooltipButton key="focus" label={strings.nodeUtils.focus} tooltipText={strings.nodeUtils.focus}
        shortcut={strings.nodeUtils.focusShortcut} icon="🔍" onClick={p.onFocusClick}
        disabled={disabled} tooltipPlacement={placement} />
) : null;

const renderCollapse: ActionRenderer = ({ p, disabled, placement }) => {
    if (!p.onCollapseToggle) return null;
    const isCollapsed = p.isCollapsed ?? false;
    const label = isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse;
    const icon = isCollapsed ? '🔽' : '🔼';
    return (
        <TooltipButton key="collapse" label={label} tooltipText={label}
            shortcut={strings.nodeUtils.collapseShortcut} icon={icon}
            onClick={p.onCollapseToggle} disabled={disabled} tooltipPlacement={placement} />
    );
};

const renderColor: ActionRenderer = ({ p, bar, disabled, placement }) => p.onColorChange ? (
    <ColorMenu key="color"
        isOpen={bar.isColorOpen} onToggle={bar.handleColorToggle}
        onClose={bar.closeSubmenu} selectedColorKey={normalizeNodeColorKey(p.nodeColorKey)}
        onColorSelect={p.onColorChange} disabled={disabled} tooltipPlacement={placement} />
) : null;

const renderShare: ActionRenderer = ({ p, bar, disabled, placement }) => p.onShareClick ? (
    <ShareMenu key="share"
        isOpen={bar.isShareOpen} onToggle={bar.handleShareToggle}
        onClose={bar.closeSubmenu} onShare={p.onShareClick}
        isSharing={p.isSharing ?? false} disabled={disabled} tooltipPlacement={placement} />
) : null;

const renderPool: ActionRenderer = ({ p, disabled, placement }) => p.onPoolToggle ? (
    <PoolAction key="pool"
        isInPool={p.isInPool ?? false} onToggle={p.onPoolToggle}
        disabled={disabled} tooltipPlacement={placement} />
) : null;

const DECK2_RENDERERS: Partial<Record<UtilsBarActionId, ActionRenderer>> = {
    tags: renderTags,
    image: renderImage,
    attachment: renderAttachment,
    duplicate: renderDuplicate,
    focus: renderFocus,
    collapse: renderCollapse,
    color: renderColor,
    share: renderShare,
    pool: renderPool,
};

export function renderDeck2Action(id: UtilsBarActionId, ctx: RenderContext): React.ReactNode {
    return DECK2_RENDERERS[id]?.(ctx) ?? null;
}
