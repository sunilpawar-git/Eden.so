/**
 * Pure helpers for processing ReactFlow node changes.
 * Extracted from CanvasView to keep the component under the line limit.
 */
import type { NodeChange } from '@xyflow/react';
import type { CanvasNode } from '../types/node';

/**
 * Applies position and remove changes to a node array with structural sharing.
 * Returns the original array reference when nothing changed.
 */
export function applyPositionAndRemoveChanges(
    nodes: CanvasNode[],
    changes: NodeChange[],
): CanvasNode[] {
    let updated = false;
    let result = nodes;

    for (const change of changes) {
        if (change.type === 'position' && change.position) {
            const idx = result.findIndex((n) => n.id === change.id);
            if (idx !== -1) {
                const node = result[idx]!;
                if (
                    node.position.x !== change.position.x ||
                    node.position.y !== change.position.y
                ) {
                    if (!updated) { result = [...result]; updated = true; }
                    result[idx] = { ...node, position: change.position };
                }
            }
        }
        if (change.type === 'remove') {
            const idx = result.findIndex((n) => n.id === change.id);
            if (idx !== -1) {
                if (!updated) { result = [...result]; updated = true; }
                result.splice(idx, 1);
            }
        }
    }

    return result;
}
