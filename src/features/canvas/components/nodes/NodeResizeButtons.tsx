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
    visible: boolean;
}

export const NodeResizeButtons = React.memo(function NodeResizeButtons({
    nodeId,
    visible,
}: NodeResizeButtonsProps) {
    const { expandWidth, expandHeight, canExpandWidth, canExpandHeight } = useNodeResize(nodeId);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    const handleExpandWidth = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            expandWidth();
        },
        [expandWidth]
    );

    const handleExpandHeight = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            expandHeight();
        },
        [expandHeight]
    );

    const visibleClass = visible ? styles.visible : '';

    return (
        <>
            {canExpandWidth && (
                <button
                    className={`${styles.resizeButton} ${styles.expandWidth} ${visibleClass}`}
                    onClick={handleExpandWidth}
                    onMouseDown={handleMouseDown}
                    aria-label={strings.resize.expandWidth}
                    title={strings.resize.expandWidth}
                    type="button"
                >
                    →
                </button>
            )}
            {canExpandHeight && (
                <button
                    className={`${styles.resizeButton} ${styles.expandHeight} ${visibleClass}`}
                    onClick={handleExpandHeight}
                    onMouseDown={handleMouseDown}
                    aria-label={strings.resize.expandHeight}
                    title={strings.resize.expandHeight}
                    type="button"
                >
                    ↓
                </button>
            )}
        </>
    );
});
