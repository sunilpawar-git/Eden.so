/**
 * Node Dimension Helpers — Pure functions for node dimension operations.
 * Extracted from canvasStoreHelpers.ts to keep files under 300 lines.
 */
import type { CanvasNode, NodeColorKey } from '../types/node';
import { clampNodeDimensions, MINDMAP_MIN_WIDTH, MINDMAP_MIN_HEIGHT } from '../types/node';
import type { ContentMode } from '../types/contentMode';
import { isContentModeMindmap } from '../types/contentMode';

/**
 * Updates a node's dimensions with clamping
 */
export function updateNodeDimensionsInArray(
    nodes: CanvasNode[],
    nodeId: string,
    width: number,
    height: number
): CanvasNode[] {
    return nodes.map((node) => {
        if (node.id !== nodeId) return node;
        let w = width, h = height;
        if (isContentModeMindmap(node.data.contentMode)) {
            w = Math.max(w, MINDMAP_MIN_WIDTH);
            h = Math.max(h, MINDMAP_MIN_HEIGHT);
        }
        const clamped = clampNodeDimensions(w, h);
        return { ...node, width: clamped.width, height: clamped.height, updatedAt: new Date() };
    });
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

/** Sets contentMode and auto-enlarges small nodes to mindmap-friendly size (never shrinks). */
export function updateContentModeInArray(
    nodes: CanvasNode[], nodeId: string, contentMode: ContentMode,
): CanvasNode[] {
    return nodes.map((node) => {
        if (node.id !== nodeId) return node;
        const updated: CanvasNode = { ...node, data: { ...node.data, contentMode }, updatedAt: new Date() };
        if (contentMode === 'mindmap') {
            const w = node.width ?? 0, h = node.height ?? 0;
            if (w < MINDMAP_MIN_WIDTH || h < MINDMAP_MIN_HEIGHT) {
                const c = clampNodeDimensions(Math.max(w, MINDMAP_MIN_WIDTH), Math.max(h, MINDMAP_MIN_HEIGHT));
                updated.width = c.width;
                updated.height = c.height;
            }
        }
        return updated;
    });
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
 * Sets node color in an idempotent way (no-op when unchanged or missing node).
 */
export function setNodeColorInArray(
    nodes: CanvasNode[],
    nodeId: string,
    colorKey: NodeColorKey
): CanvasNode[] {
    const target = nodes.find((node) => node.id === nodeId);
    if (!target || target.data.colorKey === colorKey) return nodes;
    return nodes.map((node) =>
        node.id === nodeId
            ? { ...node, data: { ...node.data, colorKey }, updatedAt: new Date() }
            : node
    );
}
