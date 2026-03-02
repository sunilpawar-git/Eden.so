/**
 * PoolPreviewBadge — Shows pooled node count as a small amber badge.
 * Renders nothing when count is 0. Used near AI-related controls
 * to indicate how many memory nodes will be used.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import styles from './PoolPreviewBadge.module.css';

interface PoolPreviewBadgeProps {
    pooledCount: number;
    totalCount: number;
}

export const PoolPreviewBadge = React.memo(function PoolPreviewBadge({
    pooledCount,
    totalCount,
}: PoolPreviewBadgeProps) {
    if (pooledCount === 0) return null;

    return (
        <span
            className={styles.badge}
            aria-label={strings.nodePool.poolPreview(pooledCount, totalCount)}
            title={strings.nodePool.poolPreview(pooledCount, totalCount)}
        >
            {pooledCount}
        </span>
    );
});
