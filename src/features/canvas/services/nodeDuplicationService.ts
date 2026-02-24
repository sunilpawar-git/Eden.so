/**
 * Node Duplication Service — Creates an orphaned copy of a canvas node
 * with a new collision-safe UUID and offset position.
 * Delegates deep-clone logic to nodeCloneUtils (single source of truth).
 */
import type { CanvasNode } from '../types/node';
import { buildClonedNode } from './nodeCloneUtils';

/** Y-axis offset for duplicated nodes (px) */
const DUPLICATE_Y_OFFSET = 50;

/**
 * Deep clones a canvas node with offset position and reset transient state.
 *
 * @param source - The node to duplicate
 * @returns A new CanvasNode with unique ID and sanitized data
 */
export function duplicateNode(source: CanvasNode): CanvasNode {
    return buildClonedNode(source, {
        position: {
            x: source.position.x,
            y: source.position.y + DUPLICATE_Y_OFFSET,
        },
    });
}
