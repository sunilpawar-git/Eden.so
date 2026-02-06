/**
 * Canvas Store Helpers - Pure functions for node/edge operations
 * Extracted from canvasStore.ts to reduce store callback size
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { clampNodeDimensions } from '../types/node';
import type { CanvasEdge } from '../types/edge';

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
