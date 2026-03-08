/**
 * useUndoableActions — Wraps canvas actions with undo/redo support.
 * Bridge between UI actions and the isolated historyStore.
 * All closures use fresh getState() to avoid stale references.
 *
 * Memory ceiling: Each command captures structuredClone'd nodes + edges.
 * With MAX_HISTORY_DEPTH = 50 and ~20 nodes per batch-delete, worst case
 * is ~1000 cloned nodes in memory. This is bounded and acceptable for
 * a session-scoped history that clears on workspace switch.
 */
import { useCallback } from 'react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { useHistoryStore } from '../stores/historyStore';
import type { CanvasNode } from '../types/node';
import type { CanvasEdge } from '../types/edge';
import type { CanvasCommandType } from '../types/history';

/** Dispatch a command to the isolated history store */
function pushCmd(type: CanvasCommandType, undo: () => void, redo: () => void, entityId?: string) {
    useHistoryStore.getState().dispatch({
        type: 'PUSH',
        command: { type, timestamp: Date.now(), undo, redo, entityId },
    });
}

/** Higher-order helper: execute first, then push to history (resilient — only records successful ops) */
function withUndo(type: CanvasCommandType, execute: () => void, reverse: () => void, entityId?: string) {
    execute();
    pushCmd(type, reverse, execute, entityId);
}

export function useUndoableActions() {
    const deleteNodeWithUndo = useCallback((nodeIds: string[], edgeIds: string[] = []) => {
        const state = useCanvasStore.getState();
        const nodeMap = getNodeMap(state.nodes);

        // Freeze nodes with Z-index
        const frozen = nodeIds
            .map((id) => ({ node: nodeMap.get(id), index: state.nodes.findIndex((n) => n.id === id) }))
            .filter((e): e is { node: CanvasNode; index: number } => e.node != null)
            .map(({ node, index }) => ({ node: structuredClone(node), index }));

        // Freeze connected edges
        const affectedEdgeIds = new Set(edgeIds);
        state.edges.forEach((e) => {
            if (nodeIds.includes(e.sourceNodeId) || nodeIds.includes(e.targetNodeId)) {
                affectedEdgeIds.add(e.id);
            }
        });
        const frozenEdges: CanvasEdge[] = structuredClone(
            state.edges.filter((e) => affectedEdgeIds.has(e.id))
        );

        const cmdType: CanvasCommandType = nodeIds.length > 1 ? 'batchDelete' : 'deleteNode';
        withUndo(cmdType, () => {
            // EXECUTE / REDO: bulk delete in single set() call
            useCanvasStore.getState().deleteNodes(nodeIds);
        }, () => {
            // UNDO: restore nodes at original Z-index, then restore orphan-guarded edges
            frozen.sort((a, b) => a.index - b.index).forEach(({ node, index }) => {
                useCanvasStore.getState().insertNodeAtIndex(node, index);
            });
            const currentNodeIds = new Set(useCanvasStore.getState().nodes.map((n) => n.id));
            frozenEdges.forEach((e) => {
                if (currentNodeIds.has(e.sourceNodeId) && currentNodeIds.has(e.targetNodeId)) {
                    useCanvasStore.getState().addEdge(e);
                }
            });
        });
    }, []);

    const addNodeWithUndo = useCallback((node: CanvasNode) => {
        withUndo('addNode', () => {
            useCanvasStore.getState().addNode(structuredClone(node));
        }, () => {
            useCanvasStore.getState().deleteNode(node.id);
        });
    }, []);

    return { deleteNodeWithUndo, addNodeWithUndo };
}
