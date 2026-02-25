/**
 * NodeUtilsBar — Floating pill action bar tucked behind node.
 * Primary actions always visible; secondary actions in inline overflow.
 * Auto-opens overflow after 600ms hover (closes on leave if auto-opened).
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { useMemo } from 'react';
import { strings } from '@/shared/localization/strings';
import { TransformMenu } from './TransformMenu';
import { ShareMenu } from './ShareMenu';
import { TooltipButton } from './TooltipButton';
import { OverflowMenu } from './OverflowMenu';
import { useOverflowAutoOpen } from '../../hooks/useOverflowAutoOpen';
import type { OverflowMenuItem } from './OverflowMenu';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import type { BarPlacement } from '../../hooks/useBarPlacement';
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
    visible?: boolean;
    /** Bar stays visible regardless of hover (right-click/long-press pin) */
    isPinnedOpen?: boolean;
    /** Side of the node to show the bar (auto-flips near viewport edge) */
    placement?: BarPlacement;
}

// eslint-disable-next-line max-lines-per-function -- NodeUtilsBar orchestrates many conditional buttons
export const NodeUtilsBar = React.memo(function NodeUtilsBar({
    onTagClick,
    onImageClick,
    onAIClick,
    onConnectClick,
    onCopyClick,
    onDuplicateClick,
    onShareClick,
    isSharing = false,
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
    visible = false,
    isPinnedOpen = false,
    placement = 'right',
}: NodeUtilsBarProps) {
    const isLeft = placement === 'left';
    const tooltipSide = placement;
    const isShown = visible || isPinnedOpen;

    const { isOpen: overflowOpen, toggle: toggleOverflow, handleMouseEnter, handleMouseLeave } =
        useOverflowAutoOpen();

    const containerClasses = [styles.container];
    if (isLeft) containerClasses.push(styles.containerLeft);
    if (isPinnedOpen) containerClasses.push(styles.containerPinnedOpen);
    else if (isShown) containerClasses.push(styles.containerVisible);

    const peekClasses = [styles.peekIndicator];
    if (isLeft) peekClasses.push(styles.peekIndicatorLeft);

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

    const hasOverflow = overflowItems.length > 0 || !!onShareClick;

    return (
        <>
            <div
                className={containerClasses.join(' ')}
                role="toolbar"
                aria-label={strings.canvas.nodeActionsLabel}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {onTransform ? (
                    <TransformMenu
                        onTransform={onTransform}
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
                        {onShareClick && (
                            <ShareMenu
                                onShare={onShareClick}
                                isSharing={isSharing}
                                disabled={disabled}
                                tooltipPlacement={tooltipSide}
                            />
                        )}
                    </OverflowMenu>
                )}
            </div>
            <div className={peekClasses.join(' ')} aria-hidden="true" />
        </>
    );
});
