/**
 * renderHoverMenuButton — Data-driven render helper for a single HoverMenu action button.
 * Uses a renderer map to keep each action case short and avoid complexity/max-lines warnings.
 */
/* eslint-disable react-refresh/only-export-components -- render helper, not a component */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { ACTION_REGISTRY, type ActionId } from '@/shared/stores/iconRegistry';
import { NodeHoverMenuAIOrTransform } from './NodeHoverMenuAIOrTransform';
import { TooltipButton } from './TooltipButton';
import type { NodeHoverMenuProps } from './NodeHoverMenu.types';
import buttonStyles from './TooltipButton.module.css';

export interface HoverMenuButtonContext {
    readonly props: NodeHoverMenuProps;
    readonly disabled: boolean;
    readonly handleCopyClick: () => void;
    readonly isTransformOpen: boolean;
    readonly handleTransformToggle: () => void;
    readonly closeSubmenu: () => void;
}

type Renderer = (ctx: HoverMenuButtonContext) => React.ReactNode;

// eslint-disable-next-line @typescript-eslint/no-empty-function -- noop fallback
const NOOP = () => {};

function btn(id: string, ctx: HoverMenuButtonContext, overrides: {
    label: string; icon: string; onClick?: () => void; shortcut?: string;
    className?: string; disabledOverride?: boolean;
}): React.ReactNode {
    return (
        <TooltipButton key={id}
            label={overrides.label} tooltipText={overrides.label} icon={overrides.icon}
            shortcut={overrides.shortcut} onClick={overrides.onClick ?? NOOP}
            disabled={overrides.disabledOverride ?? ctx.disabled}
            className={overrides.className} tooltipPlacement="right" />
    );
}

/** Each action's renderer — kept to a few lines so no single function exceeds limits. */
const RENDERERS: Record<string, Renderer> = {
    ai: (ctx) => (
        <NodeHoverMenuAIOrTransform key="ai"
            onTransform={ctx.props.onTransform} isTransformOpen={ctx.isTransformOpen}
            onTransformToggle={ctx.handleTransformToggle} onCloseSubmenu={ctx.closeSubmenu}
            onRegenerate={ctx.props.onRegenerate} disabled={ctx.disabled}
            hasContent={ctx.props.hasContent ?? false} isTransforming={ctx.props.isTransforming ?? false}
            tooltipPlacement="right" onAIClick={ctx.props.onAIClick} />
    ),
    connect: (ctx) => btn('connect', ctx, {
        label: strings.nodeUtils.connect, icon: strings.nodeUtils.connectIcon,
        onClick: ctx.props.onConnectClick,
    }),
    copy: (ctx) => btn('copy', ctx, {
        label: strings.nodeUtils.copy, icon: strings.nodeUtils.copyIcon,
        shortcut: strings.nodeUtils.copyShortcut, onClick: ctx.handleCopyClick,
        disabledOverride: ctx.disabled || !(ctx.props.hasContent ?? false),
    }),
    delete: (ctx) => btn('delete', ctx, {
        label: strings.nodeUtils.delete, icon: strings.nodeUtils.deleteIcon,
        shortcut: strings.nodeUtils.deleteShortcut, onClick: ctx.props.onDelete,
        className: buttonStyles.deleteButton,
    }),
    pin: (ctx) => btn('pin', ctx, {
        label: ctx.props.isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin,
        icon: ctx.props.isPinned ? '📍' : '📌',
        onClick: ctx.props.onPinToggle ?? ctx.props.onMoreClick,
    }),
    duplicate: (ctx) => {
        const m = ACTION_REGISTRY.get('duplicate');
        return m ? btn('duplicate', ctx, { label: m.label(), icon: m.icon, onClick: ctx.props.onDuplicateClick ?? ctx.props.onMoreClick }) : null;
    },
    collapse: (ctx) => btn('collapse', ctx, {
        label: ctx.props.isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse,
        icon: ctx.props.isCollapsed ? '🔽' : '🔼',
        onClick: ctx.props.onCollapseToggle ?? ctx.props.onMoreClick,
    }),
    focus: (ctx) => {
        const m = ACTION_REGISTRY.get('focus');
        return m ? btn('focus', ctx, { label: m.label(), icon: m.icon, onClick: ctx.props.onFocusClick ?? ctx.props.onMoreClick }) : null;
    },
    tags: (ctx) => {
        const m = ACTION_REGISTRY.get('tags');
        return m ? btn('tags', ctx, { label: m.label(), icon: m.icon, onClick: ctx.props.onTagClick ?? ctx.props.onMoreClick }) : null;
    },
    mindmap: (ctx) => {
        const m = ACTION_REGISTRY.get('mindmap');
        return m ? btn('mindmap', ctx, {
            label: ctx.props.isMindmapMode ? strings.nodeUtils.textView : strings.nodeUtils.mindmapView,
            icon: m.icon, onClick: ctx.props.onContentModeToggle ?? ctx.props.onMoreClick,
        }) : null;
    },
    image: (ctx) => {
        const m = ACTION_REGISTRY.get('image');
        return m ? btn('image', ctx, { label: m.label(), icon: m.icon, onClick: ctx.props.onImageClick ?? ctx.props.onMoreClick }) : null;
    },
    attachment: (ctx) => {
        const m = ACTION_REGISTRY.get('attachment');
        return m ? btn('attachment', ctx, { label: m.label(), icon: m.icon, onClick: ctx.props.onAttachmentClick ?? ctx.props.onMoreClick }) : null;
    },
    pool: (ctx) => btn('pool', ctx, {
        label: ctx.props.isInPool ? strings.nodePool.removeFromPool : strings.nodePool.addToPool,
        icon: ACTION_REGISTRY.get('pool')?.icon ?? '🧠',
        onClick: ctx.props.onPoolToggle ?? ctx.props.onMoreClick,
    }),
    color: (ctx) => {
        const m = ACTION_REGISTRY.get('color');
        return m ? btn('color', ctx, { label: m.label(), icon: m.icon, onClick: ctx.props.onMoreClick }) : null;
    },
    share: (ctx) => {
        const m = ACTION_REGISTRY.get('share');
        return m ? btn('share', ctx, { label: m.label(), icon: m.icon, onClick: ctx.props.onMoreClick }) : null;
    },
};

export function renderHoverMenuButton(id: ActionId, ctx: HoverMenuButtonContext): React.ReactNode {
    return RENDERERS[id]?.(ctx) ?? null;
}
