/**
 * Add Node Button - Floating action button to add new nodes
 */
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../stores/canvasStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import { createIdeaNode } from '../types/node';
import styles from './AddNodeButton.module.css';

export function AddNodeButton() {
    const { screenToFlowPosition } = useReactFlow();
    const addNode = useCanvasStore((s) => s.addNode);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

    const handleAddNode = useCallback(() => {
        // Get center of viewport
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const position = screenToFlowPosition({
            x: centerX,
            y: centerY,
        });

        const newNode = createIdeaNode(
            `idea-${Date.now()}`,
            currentWorkspaceId ?? DEFAULT_WORKSPACE_ID,
            position
        );

        addNode(newNode);
    }, [screenToFlowPosition, addNode, currentWorkspaceId]);

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
