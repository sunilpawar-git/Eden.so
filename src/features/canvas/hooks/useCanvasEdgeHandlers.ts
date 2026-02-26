import { useCallback } from 'react';
import type { EdgeChange, OnEdgesChange, OnConnect, OnSelectionChangeFunc } from '@xyflow/react';
import { useCanvasStore, EMPTY_SELECTED_IDS } from '../stores/canvasStore';
import { DEFAULT_WORKSPACE_ID } from '@/features/workspace/stores/workspaceStore';

export function useCanvasEdgeHandlers(currentWorkspaceId: string | null, isCanvasLocked: boolean) {
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            if (isCanvasLocked) return;
            const removals = changes.filter((c) => c.type === 'remove');
            if (removals.length === 0) return;
            useCanvasStore.setState((state) => {
                const removeIds = new Set(removals.map((c) => c.id));
                const filtered = state.edges.filter((e) => !removeIds.has(e.id));
                return filtered.length !== state.edges.length ? { edges: filtered } : {};
            });
        },
        [isCanvasLocked]
    );

    const onConnect: OnConnect = useCallback(
        (connection) => {
            if (isCanvasLocked) return;
            if (connection.source && connection.target) {
                useCanvasStore.getState().addEdge({
                    id: `edge-${Date.now()}`,
                    workspaceId: currentWorkspaceId ?? DEFAULT_WORKSPACE_ID,
                    sourceNodeId: connection.source,
                    targetNodeId: connection.target,
                    relationshipType: 'related',
                });
            }
        },
        [currentWorkspaceId, isCanvasLocked]
    );

    const onSelectionChange: OnSelectionChangeFunc = useCallback(
        ({ nodes: selectedNodes }) => {
            if (isCanvasLocked) return;
            const current = useCanvasStore.getState().selectedNodeIds;
            if (selectedNodes.length === 0) {
                if (current.size === 0) return;
                useCanvasStore.setState({ selectedNodeIds: EMPTY_SELECTED_IDS as Set<string> });
                return;
            }
            const newIds = new Set(selectedNodes.map((n) => n.id));
            if (newIds.size === current.size && [...newIds].every((id) => current.has(id))) return;
            useCanvasStore.setState({ selectedNodeIds: newIds });
        },
        [isCanvasLocked]
    );

    return { onEdgesChange, onConnect, onSelectionChange };
}
