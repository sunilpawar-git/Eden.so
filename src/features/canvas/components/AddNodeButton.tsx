/**
 * Add Node Button - Floating action button to add new nodes
 */
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../stores/canvasStore';
import { createPromptNode } from '../types/node';
import styles from './AddNodeButton.module.css';

export function AddNodeButton() {
    const { screenToFlowPosition } = useReactFlow();
    const addNode = useCanvasStore((s) => s.addNode);

    const handleAddNode = useCallback(() => {
        // Get center of viewport
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const position = screenToFlowPosition({
            x: centerX,
            y: centerY,
        });

        const newNode = createPromptNode(
            `node-${Date.now()}`,
            'workspace-1', // TODO: Get from workspace store
            position
        );

        addNode(newNode);
    }, [screenToFlowPosition, addNode]);

    return (
        <button
            className={styles.addButton}
            onClick={handleAddNode}
            aria-label={strings.canvas.addNode}
            title={strings.canvas.addNode}
        >
            <span className={styles.icon}>+</span>
        </button>
    );
}
