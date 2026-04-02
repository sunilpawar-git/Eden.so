/**
 * Node Duplication Service — Creates an orphaned copy of a canvas node
 * with a new collision-safe UUID, positioned beside the source node.
 * Uses spiral collision avoidance so duplicates never overlap existing nodes.
 * Delegates deep-clone logic to nodeCloneUtils (single source of truth).
 */
import type { CanvasNode } from '../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import { buildClonedNode } from './nodeCloneUtils';
import { GRID_GAP } from './gridConstants';
import { findNearestOpenSlot } from './spiralPlacement';

/**
 * Deep clones a canvas node and positions it to the right of the source,
 * using spiral search to avoid overlapping any existing node.
 *
 * @param source - The node to duplicate
 * @param existingNodes - All current nodes (used for collision avoidance)
 * @returns A new CanvasNode with unique ID positioned beside the source
 */
export function duplicateNode(source: CanvasNode, existingNodes: CanvasNode[]): CanvasNode {
    const sourceWidth = source.width ?? DEFAULT_NODE_WIDTH;
    const targetX = source.position.x + sourceWidth + GRID_GAP;
    const targetY = source.position.y;
    const position = findNearestOpenSlot(
        targetX, targetY, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, existingNodes,
    );
    return buildClonedNode(source, { position });
}
