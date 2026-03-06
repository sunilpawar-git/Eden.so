/**
 * NodeResizeButtons - Arrow buttons for incremental node resizing
 * Positioned at top-right (width) and bottom-left (height) of node
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { useNodeResizeHandlers } from '../../hooks/useNodeResizeHandlers';
import styles from './NodeResizeButtons.module.css';

interface NodeResizeButtonsProps {
    nodeId: string;
}

export const NodeResizeButtons = React.memo(function NodeResizeButtons({
    nodeId,
}: NodeResizeButtonsProps) {
    const {
        handleMouseDown, handleExpandWidth, handleExpandHeight,
        handleShrinkWidth, handleShrinkHeight,
        canExpandWidth, canExpandHeight, canShrinkWidth, canShrinkHeight,
    } = useNodeResizeHandlers(nodeId);

    return (
        <div className={styles.resizeButtonsContainer}>
            {/* Width Controls (Top Right) */}
            <div className={styles.widthControls}>
                {canShrinkWidth && (
                    <button className={styles.resizeButton}
                        onClick={handleShrinkWidth} onMouseDown={handleMouseDown}
                        aria-label={strings.resize.reduceWidth} title={strings.resize.reduceWidth}
                        type="button">
                        ←
                    </button>
                )}
                {canExpandWidth && (
                    <button className={styles.resizeButton}
                        onClick={handleExpandWidth} onMouseDown={handleMouseDown}
                        aria-label={strings.resize.expandWidth} title={strings.resize.expandWidth}
                        type="button">
                        →
                    </button>
                )}
            </div>

            {/* Height Controls (Bottom Left) */}
            <div className={styles.heightControls}>
                {canShrinkHeight && (
                    <button className={styles.resizeButton}
                        onClick={handleShrinkHeight} onMouseDown={handleMouseDown}
                        aria-label={strings.resize.reduceHeight} title={strings.resize.reduceHeight}
                        type="button">
                        ↑
                    </button>
                )}
                {canExpandHeight && (
                    <button className={styles.resizeButton}
                        onClick={handleExpandHeight} onMouseDown={handleMouseDown}
                        aria-label={strings.resize.expandHeight} title={strings.resize.expandHeight}
                        type="button">
                        ↓
                    </button>
                )}
            </div>
        </div>
    );
});
