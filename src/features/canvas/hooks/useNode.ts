/**
 * useNode — O(1) per-node subscription via useSyncExternalStore.
 *
 * Returns the full CanvasNode or undefined. Compares by node reference
 * (Object.is), so it re-renders when ANY field changes (position, data, etc).
 * During drag, position is isolated in useReducer (Phase 2) so the store
 * node ref does not change — no spurious re-renders.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import type { CanvasNode } from '../types/node';

export function useNode(nodeId: string | null): CanvasNode | undefined {
    const getSnapshot = useCallback(
        () => (nodeId ? getNodeMap(useCanvasStore.getState().nodes).get(nodeId) : undefined),
        [nodeId],
    );

    return useSyncExternalStore(useCanvasStore.subscribe, getSnapshot);
}
