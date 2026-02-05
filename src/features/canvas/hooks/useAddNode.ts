/**
 * useAddNode Hook - Create new nodes at viewport center
 * Requires ReactFlow context for viewport position calculation
 */
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import { createIdeaNode } from '../types/node';

export function useAddNode() {
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

    return handleAddNode;
}
