/**
 * NodeUtilsBar — Floating pill action bar tucked behind node
 * Uses TooltipButton for portal-based tooltips with keyboard shortcut hints.
 * Features: Tags, AI Actions (with TransformMenu), Connect, Copy, Delete
 */
import { strings } from '@/shared/localization/strings';
import { TransformMenu } from './TransformMenu';
import { TooltipButton } from './TooltipButton';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import type { BarPlacement } from '../../hooks/useBarPlacement';
import styles from './NodeUtilsBar.module.css';

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
    /** Side of the node to show the bar (auto-flips near viewport edge) */
    placement?: BarPlacement;
}

export function NodeUtilsBar({
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
    placement = 'right',
}: NodeUtilsBarProps) {
    const isLeft = placement === 'left';
    const containerClasses = [styles.container];
    if (isLeft) containerClasses.push(styles.containerLeft);
    if (visible) containerClasses.push(styles.containerVisible);

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
                        disabled={disabled}
                    />
                )}
                <TooltipButton
                    label={strings.nodeUtils.connect}
                    tooltipText={strings.nodeUtils.connect}
                    icon="🔗"
                    onClick={onConnectClick}
                    disabled={disabled}
                />
                {onCopyClick && (
                    <TooltipButton
                        label={strings.nodeUtils.copy}
                        tooltipText={strings.nodeUtils.copy}
                        shortcut={strings.nodeUtils.copyShortcut}
                        icon="📋"
                        onClick={onCopyClick}
                        disabled={disabled || !hasContent}
                    />
                )}
                {onPinToggle && (
                    <TooltipButton
                        label={isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                        tooltipText={isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                        icon={isPinned ? '📌' : '📌'}
                        onClick={onPinToggle}
                        disabled={disabled}
                    />
                )}
                {onCollapseToggle && (
                    <TooltipButton
                        label={isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse}
                        tooltipText={isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse}
                        icon={isCollapsed ? '▴' : '▾'}
                        onClick={onCollapseToggle}
                        disabled={disabled}
                    />
                )}
                <TooltipButton
                    label={strings.nodeUtils.delete}
                    tooltipText={strings.nodeUtils.delete}
                    shortcut={strings.nodeUtils.deleteShortcut}
                    icon="🗑️"
                    onClick={onDelete}
                    disabled={disabled}
                    className={styles.deleteButton}
                />
            </div>
            <div className={peekClasses.join(' ')} aria-hidden="true" />
        </>
    );
}
