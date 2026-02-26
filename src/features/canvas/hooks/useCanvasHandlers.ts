import { useCallback, useRef, useEffect } from 'react';
import type { NodeChange, OnNodesChange } from '@xyflow/react';
import { useCanvasStore } from '../stores/canvasStore';
import { applyPositionAndRemoveChanges } from '../components/canvasChangeHelpers';
import { useCanvasEdgeHandlers } from './useCanvasEdgeHandlers';

export function useCanvasHandlers(currentWorkspaceId: string | null, isCanvasLocked: boolean) {
    const pendingResize = useRef<{ id: string; width: number; height: number } | null>(null);
    const rafId = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (rafId.current !== null) cancelAnimationFrame(rafId.current);
        };
    }, []);

    const onNodesChange: OnNodesChange = useCallback(
        (changes: NodeChange[]) => {
            if (isCanvasLocked) return;

            let hasPositionOrRemove = false;
            for (const change of changes) {
                if ((change.type === 'position' && change.position) || change.type === 'remove') {
                    hasPositionOrRemove = true;
                }
                if (change.type === 'dimensions' && change.dimensions && change.resizing) {
                    pendingResize.current = {
                        id: change.id,
                        width: change.dimensions.width,
                        height: change.dimensions.height,
                    };
                    rafId.current ??= requestAnimationFrame(() => {
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
                }
            }

            if (!hasPositionOrRemove) return;

            useCanvasStore.setState((state) => {
                const result = applyPositionAndRemoveChanges(state.nodes, changes);
                return result !== state.nodes ? { nodes: result } : {};
            });
        },
        [isCanvasLocked]
    );

    const edgeHandlers = useCanvasEdgeHandlers(currentWorkspaceId, isCanvasLocked);
    return { onNodesChange, ...edgeHandlers };
}
