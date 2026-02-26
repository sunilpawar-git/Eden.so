/**
 * NodeResizeButtons - Arrow buttons for incremental node resizing
 * Positioned at top-right (width) and bottom-left (height) of node
 */
import React, { useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { useNodeResize } from '../../hooks/useNodeResize';
import styles from './NodeResizeButtons.module.css';

interface NodeResizeButtonsProps {
    nodeId: string;
}

export const NodeResizeButtons = React.memo(function NodeResizeButtons({
    nodeId,
}: NodeResizeButtonsProps) {
    const {
        expandWidth, expandHeight, shrinkWidth, shrinkHeight,
        canExpandWidth, canExpandHeight, canShrinkWidth, canShrinkHeight
    } = useNodeResize(nodeId);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    const handleExpandWidth = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        expandWidth();
    }, [expandWidth]);

    const handleExpandHeight = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        expandHeight();
    }, [expandHeight]);

    const handleShrinkWidth = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        shrinkWidth();
    }, [shrinkWidth]);

    const handleShrinkHeight = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        shrinkHeight();
    }, [shrinkHeight]);

    return (
        <div className={styles.resizeButtonsContainer}>
            {/* Width Controls (Top Right) */}
            <div className={styles.widthControls}>
                {canShrinkWidth && (
                    <button
                        className={styles.resizeButton}
                        onClick={handleShrinkWidth}
                        onMouseDown={handleMouseDown}
                        aria-label={strings.resize.reduceWidth}
                        title={strings.resize.reduceWidth}
                        type="button"
                    >
                        ←
                    </button>
                )}
                {canExpandWidth && (
                    <button
                        className={styles.resizeButton}
                        onClick={handleExpandWidth}
                        onMouseDown={handleMouseDown}
                        aria-label={strings.resize.expandWidth}
                        title={strings.resize.expandWidth}
                        type="button"
                    >
                        →
                    </button>
                )}
            </div>

            {/* Height Controls (Bottom Left) */}
            <div className={styles.heightControls}>
                {canShrinkHeight && (
                    <button
                        className={styles.resizeButton}
                        onClick={handleShrinkHeight}
                        onMouseDown={handleMouseDown}
                        aria-label={strings.resize.reduceHeight}
                        title={strings.resize.reduceHeight}
                        type="button"
                    >
                        ↑
                    </button>
                )}
                {canExpandHeight && (
                    <button
                        className={styles.resizeButton}
                        onClick={handleExpandHeight}
                        onMouseDown={handleMouseDown}
                        aria-label={strings.resize.expandHeight}
                        title={strings.resize.expandHeight}
                        type="button"
                    >
                        ↓
                    </button>
                )}
            </div>
        </div>
    );
});
