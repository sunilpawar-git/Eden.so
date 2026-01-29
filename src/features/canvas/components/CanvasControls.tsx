/**
 * Canvas Controls - Zoom, fit, and utility controls
 */
import { useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../stores/canvasStore';
import styles from './CanvasControls.module.css';

export function CanvasControls() {
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
        <div className={styles.controls}>
            <button
                className={styles.controlButton}
                onClick={handleClear}
                disabled={nodeCount === 0}
                aria-label={strings.canvas.clearCanvas}
                title={strings.canvas.clearCanvas}
            >
                <span className={styles.icon}>🗑</span>
            </button>
        </div>
    );
}
