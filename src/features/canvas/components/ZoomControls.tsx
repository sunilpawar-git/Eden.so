import { memo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import styles from './ZoomControls.module.css';

/**
 * Custom Zoom Controls component.
 * Replaces the default ReactFlow Controls to add a Lock button
 * and allow full TDD coverage.
 */
export const ZoomControls = memo(function ZoomControls() {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const isCanvasLocked = useSettingsStore((s) => s.isCanvasLocked);
    const toggleCanvasLocked = useSettingsStore((s) => s.toggleCanvasLocked);

    return (
        <div className={styles.container} data-testid="zoom-controls">
            <button
                className={styles.button}
                onClick={() => zoomIn()}
                aria-label="Zoom In"
                title="Zoom In"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
            <button
                className={styles.button}
                onClick={() => zoomOut()}
                aria-label="Zoom Out"
                title="Zoom Out"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
            <button
                className={styles.button}
                onClick={() => fitView()}
                aria-label="Fit View"
                title="Fit View"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
            </button>
            <button
                className={`${styles.button} ${isCanvasLocked ? styles.active : ''}`}
                onClick={toggleCanvasLocked}
                aria-label={isCanvasLocked ? "Unlock Canvas" : "Lock Canvas"}
                title={isCanvasLocked ? "Unlock Canvas" : "Lock Canvas"}
                data-testid="lock-button"
            >
                {isCanvasLocked ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                )}
            </button>
        </div>
    );
});
