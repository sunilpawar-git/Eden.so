/**
 * buildRfEdges — Structural sharing for ReactFlow edge objects.
 *
 * Mirrors buildRfNodes: reuses previous Edge objects when the underlying
 * CanvasEdge hasn't changed. This prevents ReactFlow's StoreUpdater from
 * diffing identical edges on every render, eliminating O(E) allocations
 * per canvas mutation.
 */
import type { Edge } from '@xyflow/react';
import type { MutableRefObject } from 'react';
import type { CanvasEdge } from '../types/edge';
import { EDGE_TYPE_DELETABLE, sourceHandleId, targetHandleId } from './canvasViewConstants';

export interface PrevRfEdges { arr: Edge[]; map: Map<string, Edge> }

export function buildRfEdges(
    edges: CanvasEdge[],
    ref: MutableRefObject<PrevRfEdges>,
): Edge[] {
    const { arr: prevArr, map: prevMap } = ref.current;
    let allReused = edges.length === prevArr.length;

    const result = edges.map((edge, index) => {
        const animated = edge.relationshipType === 'derived';
        const prev = prevMap.get(edge.id);

        if (prev
            && prev.source === edge.sourceNodeId
            && prev.target === edge.targetNodeId
            && prev.animated === animated) {
            if (prevArr[index] !== prev) allReused = false;
            return prev;
        }

        allReused = false;
        return {
            id: edge.id,
            source: edge.sourceNodeId,
            target: edge.targetNodeId,
            sourceHandle: sourceHandleId(edge.sourceNodeId),
            targetHandle: targetHandleId(edge.targetNodeId),
            type: EDGE_TYPE_DELETABLE,
            animated,
        };
    });

    if (allReused) return prevArr;

    ref.current = { arr: result, map: new Map(result.map((e) => [e.id, e])) };
    return result;
}
