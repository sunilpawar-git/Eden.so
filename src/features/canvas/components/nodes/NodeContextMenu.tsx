/**
 * NodeContextMenu — Portal-rendered right-click / "More..." context menu.
 * Actions are now driven by user-configurable contextMenuIcons in settingsStore.
 * Color/Share render as expandable sub-panels.
 */
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { getPortalRoot } from '@/shared/utils/portalRoot';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { type ActionId } from '@/shared/stores/iconRegistry';
import { CONTEXT_MENU_GROUPS } from '../../types/utilsBarLayout';
import { type NodeColorKey } from '../../types/node';
import { MenuSeparator, GroupLabel } from './ContextMenuItems';
import { renderContextMenuItem, type ContextMenuItemContext } from './renderContextMenuItem';
import styles from './NodeContextMenu.module.css';

const VIEWPORT_PADDING_PX = 8;

export interface NodeContextMenuProps {
    readonly nodeId: string;
    readonly position: { x: number; y: number };
    readonly onClose: () => void;
    readonly onTagClick: () => void;
    readonly onImageClick?: () => void;
    readonly onAttachmentClick?: () => void;
    readonly onFocusClick?: () => void;
    readonly onDuplicateClick?: () => void;
    readonly onShareClick?: (targetWorkspaceId: string) => Promise<void>;
    readonly isSharing?: boolean;
    readonly onPinToggle?: () => void;
    readonly onCollapseToggle?: () => void;
    readonly onPoolToggle?: () => void;
    readonly onColorChange?: (colorKey: NodeColorKey) => void;
    readonly nodeColorKey?: NodeColorKey;
    readonly isPinned: boolean;
    readonly isCollapsed: boolean;
    readonly isInPool: boolean;
    readonly onContentModeToggle?: () => void;
    readonly isMindmapMode?: boolean;
    // Primary actions that may appear in context menu via icon placement
    readonly onDeleteClick?: () => void;
    readonly onCopyClick?: () => void;
    readonly onConnectClick?: () => void;
    readonly onAIClick?: () => void;
    readonly hasContent?: boolean;
}

/** Group definitions with ordered group keys */
const GROUP_ORDER: ReadonlyArray<keyof typeof CONTEXT_MENU_GROUPS> = ['primary', 'organize', 'appearance', 'insert', 'sharing'];
const GROUP_LABELS: Record<string, () => string> = {
    primary: () => strings.contextMenu.primary,
    organize: () => strings.contextMenu.organize,
    appearance: () => strings.contextMenu.appearance,
    insert: () => strings.contextMenu.insert,
    sharing: () => strings.contextMenu.sharing,
};

export const NodeContextMenu = React.memo(function NodeContextMenu(props: NodeContextMenuProps) {
    const { position, onClose } = props;
    const menuRef = useRef<HTMLDivElement>(null);
    const [expandedPanel, setExpandedPanel] = useState<'color' | 'share' | null>(null);
    const [clampedPos, setClampedPos] = useState(position);

    // Read configurable context menu icons (scalar selector)
    const contextMenuIcons = useSettingsStore((s) => s.contextMenuIcons);

    useEscapeLayer(ESCAPE_PRIORITY.CONTEXT_MENU, true, onClose);
    useContextMenuPosition(menuRef, position, expandedPanel, setClampedPos);
    useContextMenuOutsideClick(menuRef, onClose);

    const action = useCallback((fn?: () => void) => () => { fn?.(); onClose(); }, [onClose]);
    const togglePanel = useCallback((panel: 'color' | 'share') => {
        setExpandedPanel((prev) => (prev === panel ? null : panel));
    }, []);

    // Build grouped items from the configurable list
    const groupedItems = useMemo(() => {
        const contextSet = new Set(contextMenuIcons);
        const groups: Array<{ key: string; items: ActionId[] }> = [];

        for (const groupKey of GROUP_ORDER) {
            const groupActions = CONTEXT_MENU_GROUPS[groupKey] as readonly string[];
            const items = groupActions.filter((a) => contextSet.has(a as ActionId)) as ActionId[];
            if (items.length > 0) {
                groups.push({ key: groupKey, items });
            }
        }
        return groups;
    }, [contextMenuIcons]);

    /** Build context object for the external render helper */
    const itemCtx: ContextMenuItemContext = useMemo(() => ({
        onClose, action, expandedPanel, togglePanel,
        onPinToggle: props.onPinToggle, isPinned: props.isPinned,
        onDuplicateClick: props.onDuplicateClick,
        onCollapseToggle: props.onCollapseToggle, isCollapsed: props.isCollapsed,
        onFocusClick: props.onFocusClick, onTagClick: props.onTagClick,
        onContentModeToggle: props.onContentModeToggle, isMindmapMode: props.isMindmapMode,
        onColorChange: props.onColorChange, nodeColorKey: props.nodeColorKey,
        onImageClick: props.onImageClick, onAttachmentClick: props.onAttachmentClick,
        onShareClick: props.onShareClick, isSharing: props.isSharing,
        onPoolToggle: props.onPoolToggle, isInPool: props.isInPool,
        onAIClick: props.onAIClick, onConnectClick: props.onConnectClick,
        onCopyClick: props.onCopyClick, onDeleteClick: props.onDeleteClick,
    }), [props, onClose, action, expandedPanel, togglePanel]);

    const renderItem = useCallback(
        (id: ActionId) => renderContextMenuItem(id, itemCtx),
        [itemCtx],
    );

    return createPortal(
        <div className={styles.menu} ref={menuRef} role="menu"
            style={{ top: clampedPos.y, left: clampedPos.x }}>
            {groupedItems.map((group, gi) => (
                <React.Fragment key={group.key}>
                    {gi > 0 && <MenuSeparator />}
                    <GroupLabel>{GROUP_LABELS[group.key]?.() ?? group.key}</GroupLabel>
                    {group.items.map(renderItem)}
                </React.Fragment>
            ))}
        </div>,
        getPortalRoot(),
    );
});

function useContextMenuPosition(
    menuRef: React.RefObject<HTMLDivElement | null>,
    position: { x: number; y: number },
    heightTrigger: unknown,
    setClamped: (pos: { x: number; y: number }) => void,
) {
    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        
        let x = position.x;
        let y = position.y;
        
        if (x + rect.width > window.innerWidth - VIEWPORT_PADDING_PX) {
            x = window.innerWidth - rect.width - VIEWPORT_PADDING_PX;
        }
        
        if (y + rect.height > window.innerHeight - VIEWPORT_PADDING_PX) {
            y = window.innerHeight - rect.height - VIEWPORT_PADDING_PX;
        }
        
        setClamped({
            x: Math.max(VIEWPORT_PADDING_PX, x),
            y: Math.max(VIEWPORT_PADDING_PX, y),
        });
    }, [menuRef, position, heightTrigger, setClamped]);
}

function useContextMenuOutsideClick(
    menuRef: React.RefObject<HTMLDivElement | null>,
    onClose: () => void,
) {
    useEffect(() => {
        const handler = (e: PointerEvent) => {
            if (!(e.target instanceof Node)) return;
            if (menuRef.current?.contains(e.target)) return;
            onClose();
        };
        document.addEventListener('pointerdown', handler, true);
        return () => document.removeEventListener('pointerdown', handler, true);
    }, [menuRef, onClose]);
}
