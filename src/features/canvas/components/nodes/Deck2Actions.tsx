/**
 * Deck2Actions — Renders Deck 2 action buttons for NodeUtilsBar.
 * Maps UtilsBarActionId to the correct component (TooltipButton, ColorMenu, ShareMenu).
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

export function renderDeck2Action(id: UtilsBarActionId, ctx: RenderContext): React.ReactNode {
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
            const icon = (p.isCollapsed ?? false) ? '🔽' : '🔼';
            return (
                <TooltipButton key={id} label={label} tooltipText={label}
                    shortcut={strings.nodeUtils.collapseShortcut} icon={icon}
                    onClick={p.onCollapseToggle} disabled={disabled} tooltipPlacement={placement} />
            );
        }
        case 'color':
            return p.onColorChange ? (
                <ColorMenu key={id}
                    isOpen={bar.isColorOpen} onToggle={bar.handleColorToggle}
                    onClose={bar.closeSubmenu} selectedColorKey={normalizeNodeColorKey(p.nodeColorKey)}
                    onColorSelect={p.onColorChange} disabled={disabled} tooltipPlacement={placement} />
            ) : null;
        case 'share':
            return p.onShareClick ? (
                <ShareMenu key={id}
                    isOpen={bar.isShareOpen} onToggle={bar.handleShareToggle}
                    onClose={bar.closeSubmenu} onShare={p.onShareClick}
                    isSharing={p.isSharing ?? false} disabled={disabled} tooltipPlacement={placement} />
            ) : null;
        case 'pool':
            return p.onPoolToggle ? (
                <PoolAction key={id}
                    isInPool={p.isInPool ?? false} onToggle={p.onPoolToggle}
                    disabled={disabled} tooltipPlacement={placement} />
            ) : null;
        default: return null;
    }
}
