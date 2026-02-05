/**
 * IdeaCardActionBar - Action buttons for IdeaCard nodes
 * Extracted for file size compliance (300 line limit)
 */
import { strings } from '@/shared/localization/strings';
import { TransformMenu } from './TransformMenu';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import styles from './IdeaCard.module.css';

interface IdeaCardActionBarProps {
    hasContent: boolean;
    isGenerating: boolean;
    isTransforming: boolean;
    onTransform: (type: TransformationType) => void;
    onRegenerate: () => void;
    onBranch: () => void;
    onDelete: () => void;
}

export function IdeaCardActionBar({
    hasContent,
    isGenerating,
    isTransforming,
    onTransform,
    onRegenerate,
    onBranch,
    onDelete,
}: IdeaCardActionBarProps) {
    return (
        <div className={styles.actionBar}>
            <TransformMenu
                onTransform={onTransform}
                disabled={!hasContent || isGenerating}
                isTransforming={isTransforming}
            />
            <button
                className={styles.actionButton}
                onClick={onRegenerate}
                disabled={isGenerating || !hasContent}
                aria-label={strings.ideaCard.regenerate}
                data-tooltip={strings.ideaCard.regenerate}
            >
                <span className={styles.icon}>↻</span>
            </button>
            <button
                className={styles.actionButton}
                onClick={onBranch}
                disabled={!hasContent}
                aria-label={strings.ideaCard.branch}
                data-tooltip={strings.ideaCard.branch}
            >
                <span className={styles.icon}>⑂</span>
            </button>
            <button
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={onDelete}
                aria-label={strings.ideaCard.delete}
                data-tooltip={strings.ideaCard.delete}
            >
                <span className={styles.icon}>🗑</span>
            </button>
        </div>
    );
}
