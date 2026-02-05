/**
 * CanvasActions - Combined action buttons (add node + clear canvas)
 * Positioned at bottom-right of canvas
 */
import { useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../stores/canvasStore';
import { useAddNode } from '../hooks/useAddNode';
import styles from './CanvasActions.module.css';

export function CanvasActions() {
    const handleAddNode = useAddNode();
    const clearCanvas = useCanvasStore((s) => s.clearCanvas);
    const nodeCount = useCanvasStore((s) => s.nodes.length);

    const handleClear = useCallback(() => {
        if (nodeCount === 0) return;
        
        const confirmed = window.confirm(strings.canvas.clearConfirm);
        if (confirmed) {
            clearCanvas();
        }
    }, [clearCanvas, nodeCount]);

    return (
        <div className={styles.actionsContainer} data-testid="canvas-actions">
            <button
                className={styles.clearButton}
                onClick={handleClear}
                disabled={nodeCount === 0}
                aria-label={strings.canvas.clearCanvas}
                title={strings.canvas.clearCanvas}
            >
                <span className={styles.icon}>🗑</span>
            </button>
            <button
                className={styles.addButton}
                onClick={handleAddNode}
                aria-label={strings.canvas.addNode}
                title={strings.canvas.addNode}
            >
                <span className={styles.icon}>+</span>
            </button>
        </div>
    );
}
