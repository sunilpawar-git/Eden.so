/**
 * useAddNode Hook - Create new nodes at next grid position
 * Single source of truth for node creation logic (used by both N shortcut and + button)
 */
import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useFocusStore } from '../stores/focusStore';
import { createIdeaNode } from '../types/node';
import { calculateNextNodePosition } from '../stores/canvasStoreHelpers';
import { calculateSmartPlacement } from '../services/freeFlowPlacementService';
import { usePanToNode } from './usePanToNode';

export function useAddNode() {
    const addNode = useCanvasStore((s) => s.addNode);
    const nodes = useCanvasStore((s) => s.nodes);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const canvasFreeFlow = useSettingsStore((s) => s.canvasFreeFlow);
    const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
    const { panToPosition } = usePanToNode();

    const handleAddNode = useCallback(() => {
        if (!currentWorkspaceId) return;

        const position = canvasFreeFlow
            ? calculateSmartPlacement(nodes, focusedNodeId ?? undefined)
            : calculateNextNodePosition(nodes);

        const newNode = createIdeaNode(
            `idea-${Date.now()}`,
            currentWorkspaceId,
            position
        );

        addNode(newNode);
        panToPosition(position.x, position.y);
    }, [addNode, nodes, currentWorkspaceId, canvasFreeFlow, focusedNodeId, panToPosition]);

    return handleAddNode;
}
