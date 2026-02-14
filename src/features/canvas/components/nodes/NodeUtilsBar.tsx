/**
 * NodeUtilsBar — Floating pill action bar tucked behind node
 * Slides out on hover via CSS transition; peek indicator signals presence.
 * Features: Tags, AI Actions (with TransformMenu), Connect, Copy, Delete
 */
import { strings } from '@/shared/localization/strings';
import { TransformMenu } from './TransformMenu';
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
                <button
                    className={styles.actionButton}
                    onClick={onTagClick}
                    disabled={disabled}
                    aria-label={strings.nodeUtils.tags}
                    data-tooltip={strings.nodeUtils.tags}
                >
                    <span className={styles.icon}>🏷️</span>
                </button>
                {onTransform ? (
                    <TransformMenu
                        onTransform={onTransform}
                        onRegenerate={onRegenerate}
                        disabled={disabled || !hasContent}
                        isTransforming={isTransforming}
                    />
                ) : (
                    <button
                        className={styles.actionButton}
                        onClick={onAIClick}
                        disabled={disabled}
                        aria-label={strings.nodeUtils.aiActions}
                        data-tooltip={strings.nodeUtils.aiActions}
                    >
                        <span className={styles.icon}>✨</span>
                    </button>
                )}
                <button
                    className={styles.actionButton}
                    onClick={onConnectClick}
                    disabled={disabled}
                    aria-label={strings.nodeUtils.connect}
                    data-tooltip={strings.nodeUtils.connect}
                >
                    <span className={styles.icon}>🔗</span>
                </button>
                {onCopyClick && (
                    <button
                        className={styles.actionButton}
                        onClick={onCopyClick}
                        disabled={disabled || !hasContent}
                        aria-label={strings.nodeUtils.copy}
                        data-tooltip={strings.nodeUtils.copy}
                    >
                        <span className={styles.icon}>📋</span>
                    </button>
                )}
                <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={onDelete}
                    disabled={disabled}
                    aria-label={strings.nodeUtils.delete}
                    data-tooltip={strings.nodeUtils.delete}
                >
                    <span className={styles.icon}>🗑️</span>
                </button>
            </div>
            <div className={styles.peekIndicator} aria-hidden="true" />
        </>
    );
}
