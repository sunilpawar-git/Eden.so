/**
 * NodeUtilsBar — Floating pill action bar tucked behind node
 * Uses TooltipButton for portal-based tooltips with keyboard shortcut hints.
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { TransformMenu } from './TransformMenu';
import { TooltipButton } from './TooltipButton';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import type { BarPlacement } from '../../hooks/useBarPlacement';
import styles from './NodeUtilsBar.module.css';
import buttonStyles from './TooltipButton.module.css';

interface NodeUtilsBarProps {
    onTagClick: () => void;
    onAIClick?: () => void;
    onConnectClick: () => void;
    onCopyClick?: () => void;
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

export const NodeUtilsBar = React.memo(function NodeUtilsBar({
    onTagClick,
    onAIClick,
    onConnectClick,
    onCopyClick,
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
    const tooltipSide = placement; // tooltips appear on same side as bar
    const isShown = visible || isPinnedOpen;
    const containerClasses = [styles.container];
    if (isLeft) containerClasses.push(styles.containerLeft);
    if (isPinnedOpen) containerClasses.push(styles.containerPinnedOpen);
    else if (isShown) containerClasses.push(styles.containerVisible);

    const peekClasses = [styles.peekIndicator];
    if (isLeft) peekClasses.push(styles.peekIndicatorLeft);

    return (
        <>
            <div className={containerClasses.join(' ')}>
                <TooltipButton
                    label={strings.nodeUtils.tags}
                    tooltipText={strings.nodeUtils.tags}
                    shortcut={strings.nodeUtils.tagsShortcut}
                    icon="🏷️"
                    onClick={onTagClick}
                    disabled={disabled}
                    tooltipPlacement={tooltipSide}
                />
                {onTransform ? (
                    <TransformMenu
                        onTransform={onTransform}
                        onRegenerate={onRegenerate}
                        disabled={disabled || !hasContent}
                        isTransforming={isTransforming}
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
                {onCollapseToggle && (
                    <TooltipButton
                        label={isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse}
                        tooltipText={isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse}
                        icon={isCollapsed ? '▴' : '▾'}
                        onClick={onCollapseToggle}
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
            </div>
            <div className={peekClasses.join(' ')} aria-hidden="true" />
        </>
    );
});
