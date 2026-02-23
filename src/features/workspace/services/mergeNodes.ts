/**
 * mergeNodes - Pure function for two-layer node merge during background refresh.
 *
 * Layer 1: If a node is currently being edited (editingNodeId), preserve the
 *          local version unconditionally — draft content lives in TipTap state,
 *          not in node.data.output, so updatedAt is NOT bumped during typing.
 *
 * Layer 2: For non-editing nodes, compare updatedAt timestamps. Keep whichever
 *          is newer; on tie, prefer remote (server is authoritative).
 *
 * Node set reconciliation:
 *   - Local-only nodes (not yet synced) are retained.
 *   - Remote-only nodes (created on another device) are added.
 *
 * SOLID: Single Responsibility — only handles merge logic, no side effects.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

/** Safe extraction of epoch millis, returning 0 for missing/invalid values */
function toEpoch(date: Date | undefined | null): number {
    if (!date) return 0;
    const ms = date.getTime();
    return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Merge local and remote node arrays with two-layer edit protection.
 *
 * @param localNodes  - Current nodes from canvasStore
 * @param remoteNodes - Fresh nodes from Firestore
 * @param editingNodeId - ID of the node currently being edited, or null
 * @returns Merged array preserving local edits and incorporating remote changes
 */
export function mergeNodes(
    localNodes: CanvasNode[],
    remoteNodes: CanvasNode[],
    editingNodeId: string | null
): CanvasNode[] {
    const localMap = new Map(localNodes.map((n) => [n.id, n]));
    const remoteMap = new Map(remoteNodes.map((n) => [n.id, n]));

    const merged: CanvasNode[] = [];

    for (const [id, remoteNode] of remoteMap) {
        const localNode = localMap.get(id);

        if (!localNode) {
            merged.push(remoteNode);
            continue;
        }

        if (id === editingNodeId) {
            merged.push(localNode);
            continue;
        }

        const localTime = toEpoch(localNode.updatedAt);
        const remoteTime = toEpoch(remoteNode.updatedAt);
        merged.push(localTime > remoteTime ? localNode : remoteNode);
    }

    for (const [id, localNode] of localMap) {
        if (!remoteMap.has(id)) {
            merged.push(localNode);
        }
    }

    return merged;
}

/**
 * Merge local and remote edge arrays by set-union on ID.
 * Edges have no updatedAt, so for shared IDs remote wins (server-authoritative).
 * Local-only edges (not yet synced) are retained.
 */
export function mergeEdges(
    localEdges: CanvasEdge[],
    remoteEdges: CanvasEdge[]
): CanvasEdge[] {
    const remoteMap = new Map(remoteEdges.map((e) => [e.id, e]));
    const merged = [...remoteEdges];

    for (const localEdge of localEdges) {
        if (!remoteMap.has(localEdge.id)) {
            merged.push(localEdge);
        }
    }

    return merged;
}
