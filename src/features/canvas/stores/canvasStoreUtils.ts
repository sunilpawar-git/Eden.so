/**
 * canvasStoreUtils — Shared utilities for canvas store.
 * Lives in a separate file to avoid circular imports between
 * canvasStore.ts and canvasStoreActions.ts.
 */
import type { CanvasNode } from '../types/node';

/** Stable reference for empty selection — prevents spurious re-renders via Object.is */
export const EMPTY_SELECTED_IDS: ReadonlySet<string> = Object.freeze(new Set<string>());

let _cachedNodes: CanvasNode[] = [];
let _cachedNodeMap: ReadonlyMap<string, CanvasNode> = new Map();

/** Memoized O(1) lookup map — only rebuilds when nodes array reference changes */
export function getNodeMap(nodes: CanvasNode[]): ReadonlyMap<string, CanvasNode> {
    if (nodes !== _cachedNodes) {
        _cachedNodes = nodes;
        _cachedNodeMap = new Map(nodes.map((n) => [n.id, n]));
    }
    return _cachedNodeMap;
}
