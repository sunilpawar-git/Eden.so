/**
 * Node Duplication Service — Creates an orphaned copy of a canvas node
 * with a new collision-safe UUID, positioned at the next masonry grid slot.
 * Delegates deep-clone logic to nodeCloneUtils (single source of truth).
 */
import type { CanvasNode } from '../types/node';
import { DEFAULT_NODE_WIDTH } from '../types/node';
import { buildClonedNode } from './nodeCloneUtils';
import { GRID_GAP } from './gridLayoutService';

/**
 * Deep clones a canvas node and positions it immediately to the right
 * of the source node at the same vertical position, so the duplicate
 * appears beside its parent rather than in a distant grid slot.
 *
 * @param source - The node to duplicate
 * @param _existingNodes - Reserved for future collision avoidance
 * @returns A new CanvasNode with unique ID positioned beside the source
 */
export function duplicateNode(source: CanvasNode, _existingNodes: CanvasNode[]): CanvasNode {
    const sourceWidth = source.width ?? DEFAULT_NODE_WIDTH;
    const position = {
        x: source.position.x + sourceWidth + GRID_GAP,
        y: source.position.y,
    };
    return buildClonedNode(source, { position });
}
