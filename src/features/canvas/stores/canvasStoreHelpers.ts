/**
 * Canvas Store Helpers - Pure functions for node/edge operations
 * Extracted from canvasStore.ts to reduce store callback size.
 * Node dimension helpers live in nodeDimensionHelpers.ts.
 */
import type { CanvasNode, NodePosition } from '../types/node';
import type { CanvasEdge } from '../types/edge';
import {
    arrangeMasonry,
    calculateMasonryPosition,
    rearrangeAfterResize,
} from '../services/gridLayoutService';

export {
    updateNodeDimensionsInArray,
    updateNodeDataField,
    updateContentModeInArray,
    appendToNodeOutputInArray,
    togglePromptCollapsedInArray,
    setNodeColorInArray,
} from './nodeDimensionHelpers';

/** Deletes a node and its connected edges */
export function deleteNodeFromArrays(
    nodes: CanvasNode[], edges: CanvasEdge[], selectedNodeIds: Set<string>, nodeId: string,
): { nodes: CanvasNode[]; edges: CanvasEdge[]; selectedNodeIds: Set<string> } {
    return {
        nodes: nodes.filter((node) => node.id !== nodeId),
        edges: edges.filter(
            (edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId
        ),
        selectedNodeIds: new Set(
            [...selectedNodeIds].filter((id) => id !== nodeId)
        ),
    };
}

/** Finds all connected node IDs for a given node */
export function getConnectedNodeIds(edges: CanvasEdge[], nodeId: string): string[] {
    const connected: string[] = [];
    edges.forEach((edge) => {
        if (edge.sourceNodeId === nodeId) {
            connected.push(edge.targetNodeId);
        }
        if (edge.targetNodeId === nodeId) {
            connected.push(edge.sourceNodeId);
        }
    });
    return connected;
}

/** Finds all upstream nodes using BFS traversal */
export function getUpstreamNodesFromArrays(
    nodes: CanvasNode[], edges: CanvasEdge[], nodeId: string,
): CanvasNode[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const visited = new Set<string>();
    const queue: string[] = [nodeId];
    const upstream: CanvasNode[] = [];

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);

        const incomingEdges = edges.filter((e) => e.targetNodeId === currentId);
        for (const edge of incomingEdges) {
            const sourceNode = nodeMap.get(edge.sourceNodeId);
            if (sourceNode && !visited.has(sourceNode.id)) {
                upstream.push(sourceNode);
                queue.push(sourceNode.id);
            }
        }
    }
    return upstream;
}

// ============================================================================
// Grid Layout Helpers
// ============================================================================

/** Grid Layout Constants - SSOT for node arrangement */
export { GRID_COLUMNS, GRID_GAP, GRID_PADDING } from '../services/gridLayoutService';

/**
 * Arranges unpinned nodes in a masonry grid layout.
 * Pinned nodes are excluded from arrangement and keep their position.
 * Pure function — does not mutate input. Preserves input array order.
 */
export function arrangeNodesInGrid(nodes: CanvasNode[], columnCount?: number): CanvasNode[] {
    return arrangeMasonry(nodes, columnCount);
}

/**
 * Calculates the position for the next node in the grid (Masonry).
 * Stacks in the shortest column.
 */
export function calculateNextNodePosition(nodes: CanvasNode[], columnCount?: number): NodePosition {
    return calculateMasonryPosition(nodes, columnCount);
}

/**
 * Rearranges nodes after a resize. Pinned nodes are excluded.
 * Pure function — does not mutate input.
 */
export function arrangeNodesAfterResize(
    nodes: CanvasNode[],
    resizedNodeId: string,
    columnCount?: number,
): CanvasNode[] {
    return rearrangeAfterResize(nodes, resizedNodeId, columnCount);
}

/** Toggles isPinned on a single node. No-op if nodeId not found. */
export function toggleNodePinnedInArray(nodes: CanvasNode[], nodeId: string): CanvasNode[] {
    if (!nodes.some((n) => n.id === nodeId)) return nodes;
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, data: { ...node.data, isPinned: !node.data.isPinned }, updatedAt: new Date() }
            : node
    );
}

/** Toggles isCollapsed on a single node. No-op if nodeId not found. */
export function toggleNodeCollapsedInArray(nodes: CanvasNode[], nodeId: string): CanvasNode[] {
    if (!nodes.some((n) => n.id === nodeId)) return nodes;
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, data: { ...node.data, isCollapsed: !node.data.isCollapsed }, updatedAt: new Date() }
            : node
    );
}

/** Toggles includeInAIPool on a single node. No-op if nodeId not found. */
export function toggleNodePoolInArray(nodes: CanvasNode[], nodeId: string): CanvasNode[] {
    if (!nodes.some((n) => n.id === nodeId)) return nodes;
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, data: { ...node.data, includeInAIPool: !node.data.includeInAIPool }, updatedAt: new Date() }
            : node
    );
}

/**
 * Clears includeInAIPool on all nodes. Only mutates nodes that were pooled.
 */
export function clearAllNodePoolInArray(nodes: CanvasNode[]): CanvasNode[] {
    if (!nodes.some((n) => n.data.includeInAIPool)) return nodes;
    return nodes.map((node) =>
        node.data.includeInAIPool
            ? { ...node, data: { ...node.data, includeInAIPool: false }, updatedAt: new Date() }
            : node
    );
}

/**
 * Inserts a node at a specific array index (Z-index restoration for undo).
 * Clamps index to valid range — no out-of-bounds risk.
 */
export function insertNodeAtIndexInArray(
    nodes: CanvasNode[],
    node: CanvasNode,
    index: number
): CanvasNode[] {
    const clamped = Math.max(0, Math.min(index, nodes.length));
    const result = [...nodes];
    result.splice(clamped, 0, node);
    return result;
}

/**
 * Bulk delete multiple nodes and their connected edges in a single pass.
 * Avoids N separate Zustand notifications — O(1) render vs O(N).
 */
export function deleteNodesFromArrays(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    selectedNodeIds: Set<string>,
    nodeIds: Set<string>
): { nodes: CanvasNode[]; edges: CanvasEdge[]; selectedNodeIds: Set<string> } {
    return {
        nodes: nodes.filter((node) => !nodeIds.has(node.id)),
        edges: edges.filter(
            (edge) => !nodeIds.has(edge.sourceNodeId) && !nodeIds.has(edge.targetNodeId)
        ),
        selectedNodeIds: new Set(
            [...selectedNodeIds].filter((id) => !nodeIds.has(id))
        ),
    };
}
