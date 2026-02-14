/**
 * NodeUtilsBar — Floating pill action bar tucked behind node
 * Uses TooltipButton for portal-based tooltips with keyboard shortcut hints.
 * Features: Tags, AI Actions (with TransformMenu), Connect, Copy, Delete
 */
import { strings } from '@/shared/localization/strings';
import { TransformMenu } from './TransformMenu';
import { TooltipButton } from './TooltipButton';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import styles from './NodeUtilsBar.module.css';

interface NodeUtilsBarProps {
    onTagClick: () => void;
    onAIClick?: () => void;
    onConnectClick: () => void;
    onCopyClick?: () => void;
    onDelete: () => void;
    onTransform?: (type: TransformationType) => void;
    onRegenerate?: () => void;
    hasContent?: boolean;
    isTransforming?: boolean;
    disabled?: boolean;
    visible?: boolean;
}

export function NodeUtilsBar({
    onTagClick,
    onAIClick,
    onConnectClick,
    onCopyClick,
    onDelete,
    onTransform,
    onRegenerate,
    hasContent = false,
    isTransforming = false,
    disabled = false,
    visible = false,
}: NodeUtilsBarProps) {
    const containerClasses = [styles.container];
    if (visible) containerClasses.push(styles.containerVisible);

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
            <div className={styles.peekIndicator} aria-hidden="true" />
        </>
    );
}
