/**
 * Node Duplication Service — Creates an orphaned copy of a canvas node
 * with a new collision-safe UUID, positioned at the next masonry grid slot.
 * Delegates deep-clone logic to nodeCloneUtils (single source of truth).
 */
import type { CanvasNode } from '../types/node';
import { buildClonedNode } from './nodeCloneUtils';
import { calculateMasonryPosition } from './gridLayoutService';

/**
 * Deep clones a canvas node and positions it at the next available
 * masonry grid slot, respecting the existing canvas layout.
 *
 * @param source - The node to duplicate
 * @param existingNodes - All current nodes on the canvas (for grid calculation)
 * @returns A new CanvasNode with unique ID and grid-aware position
 */
export function duplicateNode(source: CanvasNode, existingNodes: CanvasNode[]): CanvasNode {
    const position = calculateMasonryPosition(existingNodes);
    return buildClonedNode(source, { position });
}
