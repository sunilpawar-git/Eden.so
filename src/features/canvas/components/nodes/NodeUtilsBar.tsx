/**
 * NodeUtilsBar — Floating pill action bar tucked behind node.
 * Primary actions always visible; secondary actions in inline overflow.
 * Auto-opens overflow after 600ms hover (closes on leave if auto-opened).
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { useMemo, useRef, useEffect, useCallback, forwardRef } from 'react';
import { strings } from '@/shared/localization/strings';
import { TransformMenu } from './TransformMenu';
import { ShareMenu } from './ShareMenu';
import { ColorMenu } from './ColorMenu';
import { TooltipButton } from './TooltipButton';
import { OverflowMenu } from './OverflowMenu';
import { useNodeUtilsController, NODE_UTILS_PORTAL_ATTR } from '../../hooks/useNodeUtilsController';
import type { OverflowMenuItem } from './OverflowMenu';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import type { NodeColorKey } from '../../types/node';
import styles from './NodeUtilsBar.module.css';
import buttonStyles from './TooltipButton.module.css';

interface NodeUtilsBarProps {
    onTagClick: () => void;
    onImageClick?: () => void;
    onAIClick?: () => void;
    onConnectClick: () => void;
    onCopyClick?: () => void;
    onDuplicateClick?: () => void;
    onShareClick?: (targetWorkspaceId: string) => Promise<void>;
    isSharing?: boolean;
    onColorChange?: (colorKey: NodeColorKey) => void;
    nodeColorKey?: NodeColorKey;
    onFocusClick?: () => void;
    onDelete: () => void;
    onTransform?: (type: TransformationType) => void;
    onRegenerate?: () => void;
    onPinToggle?: () => void;
    onCollapseToggle?: () => void;
    hasContent?: boolean;
    isTransforming?: boolean;
    isPinned?: boolean;
    isCollapsed?: boolean;
    disabled?: boolean;
    /** Bar stays visible regardless of hover (right-click/long-press pin) */
    isPinnedOpen?: boolean;
}

// eslint-disable-next-line max-lines-per-function -- NodeUtilsBar orchestrates many conditional buttons
export const NodeUtilsBar = React.memo(forwardRef<HTMLDivElement, NodeUtilsBarProps>(function NodeUtilsBar({
    onTagClick,
    onImageClick,
    onAIClick,
    onConnectClick,
    onCopyClick,
    onDuplicateClick,
    onShareClick,
    isSharing = false,
    onColorChange,
    nodeColorKey = 'default',
    onFocusClick,
    onDelete,
    onTransform,
    onRegenerate,
    onPinToggle,
    onCollapseToggle,
    hasContent = false,
    isTransforming = false,
    isPinned = false,
    isCollapsed = false,
    disabled = false,
    isPinnedOpen = false,
}, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const overflowOpenRef = useRef(false);
    const tooltipSide: 'left' | 'right' = 'right';
    const { state, actions: controllerActions } = useNodeUtilsController(isPinnedOpen);
    const {
        onOutsidePointer,
        onEscape,
        handleHoverEnter,
        handleHoverLeave,
        toggleOverflow,
        openSubmenu,
        closeSubmenu,
    } = controllerActions;
    const overflowOpen = state.overflowOpen;
    overflowOpenRef.current = overflowOpen;
    const isShareOpen = state.activeSubmenu === 'share';
    const isTransformOpen = state.activeSubmenu === 'transform';
    const isColorOpen = state.activeSubmenu === 'color';

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!overflowOpenRef.current) return;
            if (event.key === 'Escape') onEscape();
        };
        const onPointerDown = (event: MouseEvent) => {
            if (!overflowOpenRef.current) return;
            const target = event.target as Node | null;
            if (!target) return;
            const element = target instanceof HTMLElement ? target : null;
            const insideToolbar = element ? containerRef.current?.contains(element) : false;
            const insidePortalZone = element?.closest(`[${NODE_UTILS_PORTAL_ATTR}="true"]`) != null;
            if (insideToolbar || insidePortalZone) return;
            onOutsidePointer();
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('mousedown', onPointerDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('mousedown', onPointerDown, true);
        };
    }, [onEscape, onOutsidePointer]);

    const handleShareToggle = useCallback(() => {
        if (isShareOpen) closeSubmenu();
        else openSubmenu('share');
    }, [closeSubmenu, openSubmenu, isShareOpen]);

    const handleTransformToggle = useCallback(() => {
        if (isTransformOpen) closeSubmenu();
        else openSubmenu('transform');
    }, [closeSubmenu, openSubmenu, isTransformOpen]);

    const handleColorToggle = useCallback(() => {
        if (isColorOpen) closeSubmenu();
        else openSubmenu('color');
    }, [closeSubmenu, openSubmenu, isColorOpen]);

    const containerClasses = [styles.container];
    if (isPinnedOpen) containerClasses.push(styles.containerPinnedOpen);

    const overflowItems = useMemo<OverflowMenuItem[]>(() => {
        const items: OverflowMenuItem[] = [
            { id: 'tags', label: strings.nodeUtils.tags, icon: '🏷️', onClick: onTagClick },
        ];
        if (onImageClick) {
            items.push({ id: 'image', label: strings.nodeUtils.image, icon: '🖼️', onClick: onImageClick });
        }
        if (onDuplicateClick) {
            items.push({ id: 'duplicate', label: strings.nodeUtils.duplicate, icon: '📑', onClick: onDuplicateClick });
        }
        if (onFocusClick) {
            items.push({ id: 'focus', label: strings.nodeUtils.focus, icon: '🔍', onClick: onFocusClick });
        }
        if (onCollapseToggle) {
            const label = isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse;
            const icon = isCollapsed ? '▴' : '▾';
            items.push({ id: 'collapse', label, icon, onClick: onCollapseToggle });
        }
        return items;
    }, [onTagClick, onImageClick, onDuplicateClick, onFocusClick, onCollapseToggle, isCollapsed]);

    const hasOverflow = overflowItems.length > 0 || !!onShareClick || !!onColorChange;

    return (
        <div ref={ref} className={styles.barWrapper}>
            <div
                ref={containerRef}
                className={containerClasses.join(' ')}
                role="toolbar"
                aria-label={strings.canvas.nodeActionsLabel}
                onMouseEnter={handleHoverEnter}
                onMouseLeave={handleHoverLeave}
            >
                {onTransform ? (
                    <TransformMenu
                        onTransform={onTransform}
                        isOpen={isTransformOpen}
                        onToggle={handleTransformToggle}
                        onClose={closeSubmenu}
                        onRegenerate={onRegenerate}
                        disabled={disabled || !hasContent}
                        isTransforming={isTransforming}
                        tooltipPlacement={tooltipSide}
                    />
                ) : (
                    <TooltipButton
                        label={strings.nodeUtils.aiActions}
                        tooltipText={strings.nodeUtils.aiActions}
                        icon="✨"
                        onClick={onAIClick ?? (() => undefined)}
                        disabled={disabled || !onAIClick}
                        tooltipPlacement={tooltipSide}
                    />
                )}
                <TooltipButton
                    label={strings.nodeUtils.connect}
                    tooltipText={strings.nodeUtils.connect}
                    icon="🔗"
                    onClick={onConnectClick}
                    disabled={disabled}
                    tooltipPlacement={tooltipSide}
                />
                {onCopyClick && (
                    <TooltipButton
                        label={strings.nodeUtils.copy}
                        tooltipText={strings.nodeUtils.copy}
                        shortcut={strings.nodeUtils.copyShortcut}
                        icon="📋"
                        onClick={onCopyClick}
                        disabled={disabled || !hasContent}
                        tooltipPlacement={tooltipSide}
                    />
                )}
                {onPinToggle && (
                    <TooltipButton
                        label={isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                        tooltipText={isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                        icon={isPinned ? '📍' : '📌'}
                        onClick={onPinToggle}
                        disabled={disabled}
                        tooltipPlacement={tooltipSide}
                    />
                )}
                <TooltipButton
                    label={strings.nodeUtils.delete}
                    tooltipText={strings.nodeUtils.delete}
                    shortcut={strings.nodeUtils.deleteShortcut}
                    icon="🗑️"
                    onClick={onDelete}
                    disabled={disabled}
                    className={buttonStyles.deleteButton}
                    tooltipPlacement={tooltipSide}
                />
                {hasOverflow && (
                    <OverflowMenu
                        items={overflowItems}
                        isOpen={overflowOpen}
                        onToggle={toggleOverflow}
                        disabled={disabled}
                        tooltipPlacement={tooltipSide}
                    >
                        {onColorChange && (
                            <ColorMenu
                                isOpen={isColorOpen}
                                onToggle={handleColorToggle}
                                onClose={closeSubmenu}
                                selectedColorKey={nodeColorKey}
                                onColorSelect={onColorChange}
                                disabled={disabled}
                                tooltipPlacement={tooltipSide}
                            />
                        )}
                        {onShareClick && (
                            <ShareMenu
                                onShare={onShareClick}
                                isOpen={isShareOpen}
                                onToggle={handleShareToggle}
                                onClose={closeSubmenu}
                                isSharing={isSharing}
                                disabled={disabled}
                                tooltipPlacement={tooltipSide}
                            />
                        )}
                    </OverflowMenu>
                )}
            </div>
            <div className={styles.peekIndicator} aria-hidden="true" />
        </div>
    );
}));
