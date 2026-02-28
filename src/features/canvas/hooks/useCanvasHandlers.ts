import { useCallback, useRef, useEffect } from 'react';
import type { NodeChange, OnNodesChange } from '@xyflow/react';
import { useCanvasStore } from '../stores/canvasStore';
import { applyPositionAndRemoveChanges } from '../components/canvasChangeHelpers';
import { useCanvasEdgeHandlers } from './useCanvasEdgeHandlers';

export function useCanvasHandlers(currentWorkspaceId: string | null, isCanvasLocked: boolean) {
    const pendingResize = useRef<{ id: string; width: number; height: number } | null>(null);
    const pendingChanges = useRef<NodeChange[]>([]);
    const rafId = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (rafId.current !== null) cancelAnimationFrame(rafId.current);
        };
    }, []);

    const onNodesChange: OnNodesChange = useCallback(
        (changes: NodeChange[]) => {
            if (isCanvasLocked) return;

            // Separate remove changes (must be processed immediately) from position/dimension changes
            const removeChanges: NodeChange[] = [];
            for (const change of changes) {
                if (change.type === 'remove') {
                    removeChanges.push(change);
                } else if (change.type === 'position' && change.position) {
                    // Batch position changes - coalesce by node ID
                    const existing = pendingChanges.current.findIndex(
                        (c) => c.type === 'position' && c.id === change.id
                    );
                    if (existing !== -1) {
                        pendingChanges.current[existing] = change;
                    } else {
                        pendingChanges.current.push(change);
                    }
                } else if (change.type === 'dimensions' && change.dimensions && change.resizing) {
                    pendingResize.current = {
                        id: change.id,
                        width: change.dimensions.width,
                        height: change.dimensions.height,
                    };
                }
            }

            // Process removes immediately (not batchable)
            if (removeChanges.length > 0) {
                useCanvasStore.setState((state) => {
                    const result = applyPositionAndRemoveChanges(state.nodes, removeChanges);
                    return result !== state.nodes ? { nodes: result } : {};
                });
            }

            // Schedule batched position/dimension updates via requestAnimationFrame
            rafId.current ??= requestAnimationFrame(() => {
                // Apply batched position changes
                if (pendingChanges.current.length > 0) {
                    const changesToApply = pendingChanges.current;
                    pendingChanges.current = [];
                    useCanvasStore.setState((state) => {
                        const result = applyPositionAndRemoveChanges(state.nodes, changesToApply);
                        return result !== state.nodes ? { nodes: result } : {};
                    });
                }

                // Apply batched dimension changes
                if (pendingResize.current) {
                    useCanvasStore.getState().updateNodeDimensions(
                        pendingResize.current.id,
                        pendingResize.current.width,
                        pendingResize.current.height
                    );
                    pendingResize.current = null;
                }

                rafId.current = null;
            });
        },
        [isCanvasLocked]
    );

    const edgeHandlers = useCanvasEdgeHandlers(currentWorkspaceId, isCanvasLocked);
    return { onNodesChange, ...edgeHandlers };
}
