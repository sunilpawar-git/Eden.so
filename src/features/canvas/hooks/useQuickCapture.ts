/**
 * useQuickCapture Hook - Create node and trigger focus for BASB quick capture
 * Returns a function that creates a node and emits an event for focusing
 */
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkspaceContext } from '@/app/contexts/WorkspaceContext';
import { DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import { createIdeaNode } from '../types/node';
import { useUndoableActions } from './useUndoableActions';

// Custom event for focusing a newly created node
export const FOCUS_NODE_EVENT = 'actionstation:focusNode';

export interface FocusNodeEvent extends CustomEvent {
    detail: { nodeId: string };
}

export function useQuickCapture() {
    const { screenToFlowPosition } = useReactFlow();
    const { currentWorkspaceId } = useWorkspaceContext();
    const { addNodeWithUndo } = useUndoableActions();

    const handleQuickCapture = useCallback(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const position = screenToFlowPosition({
            x: centerX,
            y: centerY,
        });

        const nodeId = `idea-${Date.now()}`;
        const newNode = createIdeaNode(
            nodeId,
            currentWorkspaceId ?? DEFAULT_WORKSPACE_ID,
            position
        );

        addNodeWithUndo(newNode);

        setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent(FOCUS_NODE_EVENT, { detail: { nodeId } })
            );
        }, 50);
    }, [screenToFlowPosition, currentWorkspaceId, addNodeWithUndo]);

    return handleQuickCapture;
}
