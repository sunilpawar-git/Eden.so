/**
 * Canvas Store Helpers - Pure functions for node/edge operations
 * Extracted from canvasStore.ts to reduce store callback size
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { clampNodeDimensions } from '../types/node';
import type { CanvasEdge } from '../types/edge';
import {
    arrangeMasonry,
    calculateMasonryPosition,
    rearrangeAfterResize,
} from '../services/gridLayoutService';

/**
 * Updates a node's position in the nodes array
 */
export function updateNodePositionInArray(
    nodes: CanvasNode[],
    nodeId: string,
    position: NodePosition
): CanvasNode[] {
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, position, updatedAt: new Date() }
            : node
    );
}

/**
 * Updates a node's dimensions with clamping
 */
export function updateNodeDimensionsInArray(
    nodes: CanvasNode[],
    nodeId: string,
    width: number,
    height: number
): CanvasNode[] {
    const clamped = clampNodeDimensions(width, height);
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, width: clamped.width, height: clamped.height, updatedAt: new Date() }
            : node
    );
}

/**
 * Updates a single data field on a node
 */
export function updateNodeDataField<K extends keyof CanvasNode['data']>(
    nodes: CanvasNode[],
    nodeId: string,
    field: K,
    value: CanvasNode['data'][K]
): CanvasNode[] {
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, data: { ...node.data, [field]: value }, updatedAt: new Date() }
            : node
    );
}

/**
 * Appends text to a node's output field
 */
export function appendToNodeOutputInArray(
    nodes: CanvasNode[],
    nodeId: string,
    chunk: string
): CanvasNode[] {
    return nodes.map((node) =>
        node.id === nodeId
            ? {
                ...node,
                data: { ...node.data, output: (node.data.output ?? '') + chunk },
                updatedAt: new Date(),
            }
            : node
    );
}

/**
 * Toggles a node's prompt collapsed state
 */
export function togglePromptCollapsedInArray(
    nodes: CanvasNode[],
    nodeId: string
): CanvasNode[] {
    return nodes.map((node) =>
        node.id === nodeId
            ? {
                ...node,
                data: { ...node.data, isPromptCollapsed: !node.data.isPromptCollapsed },
                updatedAt: new Date(),
            }
            : node
    );
}

/**
 * Deletes a node and its connected edges
 */
export function deleteNodeFromArrays(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    selectedNodeIds: Set<string>,
    nodeId: string
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

/**
 * Finds all connected node IDs for a given node
 */
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

/**
 * Finds all upstream nodes using BFS traversal
 */
export function getUpstreamNodesFromArrays(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    nodeId: string
): CanvasNode[] {
    const visited = new Set<string>();
    const queue: string[] = [nodeId];
    const upstream: CanvasNode[] = [];

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);

        const incomingEdges = edges.filter((e) => e.targetNodeId === currentId);
        for (const edge of incomingEdges) {
            const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId);
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
 * Arranges nodes in a grid layout (Masonry)
 * Sorts by createdAt (oldest first) and stacks in shortest column.
 * Pure function - does not mutate input.
 */
export function arrangeNodesInGrid(nodes: CanvasNode[]): CanvasNode[] {
    return arrangeMasonry(nodes);
}

/**
 * Calculates the position for the next node in the grid (Masonry).
 * Stacks in the shortest column.
 */
export function calculateNextNodePosition(nodes: CanvasNode[]): NodePosition {
    return calculateMasonryPosition(nodes);
}

/**
 * Incrementally rearranges nodes after a single node resize.
 * More efficient than full arrangeNodesInGrid - only updates affected neighbors.
 * Pure function - does not mutate input.
 */
export function arrangeNodesAfterResize(
    nodes: CanvasNode[],
    resizedNodeId: string
): CanvasNode[] {
    return rearrangeAfterResize(nodes, resizedNodeId);
}

/**
 * Toggles isPinned on a single node. No-op if nodeId not found.
 */
export function toggleNodePinnedInArray(
    nodes: CanvasNode[],
    nodeId: string
): CanvasNode[] {
    const idx = nodes.findIndex((n) => n.id === nodeId);
    if (idx === -1) return nodes;
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, data: { ...node.data, isPinned: !node.data.isPinned }, updatedAt: new Date() }
            : node
    );
}

/**
 * Toggles isCollapsed on a single node. No-op if nodeId not found.
 */
export function toggleNodeCollapsedInArray(
    nodes: CanvasNode[],
    nodeId: string
): CanvasNode[] {
    const idx = nodes.findIndex((n) => n.id === nodeId);
    if (idx === -1) return nodes;
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, data: { ...node.data, isCollapsed: !node.data.isCollapsed }, updatedAt: new Date() }
            : node
    );
}

