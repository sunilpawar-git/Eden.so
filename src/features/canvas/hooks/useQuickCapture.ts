/**
 * useQuickCapture Hook - Create node and trigger focus for BASB quick capture
 * Returns a function that creates a node and emits an event for focusing
 */
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';
import { createIdeaNode } from '../types/node';

// Custom event for focusing a newly created node
export const FOCUS_NODE_EVENT = 'actionstation:focusNode';

export interface FocusNodeEvent extends CustomEvent {
    detail: { nodeId: string };
}

export function useQuickCapture() {
    const { screenToFlowPosition } = useReactFlow();
    const addNode = useCanvasStore((s) => s.addNode);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

    const handleQuickCapture = useCallback(() => {
        // Get center of viewport
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

        addNode(newNode);

        // Dispatch custom event to trigger focus on the new node
        // Small delay to ensure node is rendered
        setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent(FOCUS_NODE_EVENT, { detail: { nodeId } })
            );
        }, 50);
    }, [screenToFlowPosition, addNode, currentWorkspaceId]);

    return handleQuickCapture;
}
