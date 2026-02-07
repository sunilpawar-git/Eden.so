/**
 * useAddNode Hook - Create new nodes at next grid position
 * Single source of truth for node creation logic (used by both N shortcut and + button)
 */
import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { createIdeaNode } from '../types/node';
import { calculateNextNodePosition } from '../stores/canvasStoreHelpers';
import { usePanToNode } from './usePanToNode';

export function useAddNode() {
    const addNode = useCanvasStore((s) => s.addNode);
    const nodes = useCanvasStore((s) => s.nodes);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const { panToPosition } = usePanToNode();

    const handleAddNode = useCallback(() => {
        if (!currentWorkspaceId) return;

        // Calculate next grid position for consistency
        const position = calculateNextNodePosition(nodes);

        const newNode = createIdeaNode(
            `idea-${Date.now()}`,
            currentWorkspaceId,
            position
        );

        addNode(newNode);

        // Pan to the new node to ensure it's visible
        panToPosition(position.x, position.y);
    }, [addNode, nodes, currentWorkspaceId, panToPosition]);

    return handleAddNode;
}
