/**
 * renderContextMenuItem — Data-driven render helper for a single context menu action.
 * Uses a renderer map to keep each action case short and avoid complexity/max-lines warnings.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { ACTION_REGISTRY, type ActionId } from '@/shared/stores/iconRegistry';
import { MenuItem, ExpandToggle } from './ContextMenuItems';
import { InlineColorPicker } from './InlineColorPicker';
import { InlineSharePanel } from './InlineSharePanel';
import { normalizeNodeColorKey, type NodeColorKey } from '../../types/node';
import styles from './NodeContextMenu.module.css';

export interface ContextMenuItemContext {
    readonly onClose: () => void;
    readonly action: (fn?: () => void) => () => void;
    readonly expandedPanel: 'color' | 'share' | null;
    readonly togglePanel: (panel: 'color' | 'share') => void;
    readonly onPinToggle?: () => void;
    readonly isPinned: boolean;
    readonly onDuplicateClick?: () => void;
    readonly onCollapseToggle?: () => void;
    readonly isCollapsed: boolean;
    readonly onFocusClick?: () => void;
    readonly onTagClick: () => void;
    readonly onContentModeToggle?: () => void;
    readonly isMindmapMode?: boolean;
    readonly onColorChange?: (colorKey: NodeColorKey) => void;
    readonly nodeColorKey?: NodeColorKey;
    readonly onImageClick?: () => void;
    readonly onAttachmentClick?: () => void;
    readonly onShareClick?: (targetWorkspaceId: string) => Promise<void>;
    readonly isSharing?: boolean;
    readonly onPoolToggle?: () => void;
    readonly isInPool: boolean;
    readonly onAIClick?: () => void;
    readonly onConnectClick?: () => void;
    readonly onCopyClick?: () => void;
    readonly onDeleteClick?: () => void;
}

type Renderer = (ctx: ContextMenuItemContext) => React.ReactNode;

function item(id: string, icon: string, label: string, onClick: () => void): React.ReactNode {
    return <MenuItem key={id} icon={icon} label={label} onClick={onClick} />;
}

const RENDERERS: Record<string, Renderer> = {
    pin: (ctx) => {
        if (!ctx.onPinToggle) return null;
        return item('pin', ctx.isPinned ? '📍' : '📌',
            ctx.isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin,
            ctx.action(ctx.onPinToggle));
    },
    duplicate: (ctx) => {
        if (!ctx.onDuplicateClick) return null;
        return item('duplicate', '📑', strings.nodeUtils.duplicate, ctx.action(ctx.onDuplicateClick));
    },
    collapse: (ctx) => {
        if (!ctx.onCollapseToggle) return null;
        return item('collapse', ctx.isCollapsed ? '🔽' : '🔼',
            ctx.isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse,
            ctx.action(ctx.onCollapseToggle));
    },
    focus: (ctx) => {
        if (!ctx.onFocusClick) return null;
        return item('focus', '🔍', strings.nodeUtils.focus, ctx.action(ctx.onFocusClick));
    },
    tags: (ctx) => item('tags', '🏷️', strings.nodeUtils.tags, ctx.action(ctx.onTagClick)),
    mindmap: (ctx) => {
        if (!ctx.onContentModeToggle) return null;
        return item('mindmap', '🗺️',
            ctx.isMindmapMode ? strings.nodeUtils.textView : strings.nodeUtils.mindmapView,
            ctx.action(ctx.onContentModeToggle));
    },
    color: (ctx) => {
        if (!ctx.onColorChange) return null;
        return (
            <React.Fragment key="color">
                <ExpandToggle icon="🎨" label={strings.nodeUtils.color}
                    expanded={ctx.expandedPanel === 'color'} onToggle={() => ctx.togglePanel('color')} />
                {ctx.expandedPanel === 'color' && (
                    <div className={styles.expandableContent}>
                        <InlineColorPicker selectedColorKey={normalizeNodeColorKey(ctx.nodeColorKey)}
                            onColorSelect={ctx.onColorChange} onClose={ctx.onClose} />
                    </div>
                )}
            </React.Fragment>
        );
    },
    image: (ctx) => {
        if (!ctx.onImageClick) return null;
        return item('image', '🖼️', strings.nodeUtils.image, ctx.action(ctx.onImageClick));
    },
    attachment: (ctx) => {
        if (!ctx.onAttachmentClick) return null;
        return item('attachment', '📎', strings.nodeUtils.attachment, ctx.action(ctx.onAttachmentClick));
    },
    share: (ctx) => {
        if (!ctx.onShareClick) return null;
        return (
            <React.Fragment key="share">
                <ExpandToggle icon="📤" label={strings.nodeUtils.share}
                    expanded={ctx.expandedPanel === 'share'} onToggle={() => ctx.togglePanel('share')} />
                {ctx.expandedPanel === 'share' && (
                    <div className={styles.expandableContent}>
                        <InlineSharePanel onShare={ctx.onShareClick}
                            isSharing={ctx.isSharing ?? false} onClose={ctx.onClose} />
                    </div>
                )}
            </React.Fragment>
        );
    },
    pool: (ctx) => {
        if (!ctx.onPoolToggle) return null;
        return item('pool', '🧠',
            ctx.isInPool ? strings.nodePool.removeFromPool : strings.nodePool.addToPool,
            ctx.action(ctx.onPoolToggle));
    },
    ai: (ctx) => {
        if (!ctx.onAIClick) return null;
        const m = ACTION_REGISTRY.get('ai');
        return m ? item('ai', m.icon, m.label(), ctx.action(ctx.onAIClick)) : null;
    },
    connect: (ctx) => {
        if (!ctx.onConnectClick) return null;
        const m = ACTION_REGISTRY.get('connect');
        return m ? item('connect', m.icon, m.label(), ctx.action(ctx.onConnectClick)) : null;
    },
    copy: (ctx) => {
        if (!ctx.onCopyClick) return null;
        const m = ACTION_REGISTRY.get('copy');
        return m ? item('copy', m.icon, m.label(), ctx.action(ctx.onCopyClick)) : null;
    },
    delete: (ctx) => {
        if (!ctx.onDeleteClick) return null;
        const m = ACTION_REGISTRY.get('delete');
        return m ? item('delete', m.icon, m.label(), ctx.action(ctx.onDeleteClick)) : null;
    },
};

export function renderContextMenuItem(id: ActionId, ctx: ContextMenuItemContext): React.ReactNode {
    return RENDERERS[id]?.(ctx) ?? null;
}
