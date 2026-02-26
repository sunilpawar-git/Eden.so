/**
 * Free Flow Placement Service - Pure functions for free-flow node positioning
 * Handles smart placement and branch placement with collision avoidance
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { getNodeMap } from '../stores/canvasStore';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import { GRID_GAP, GRID_PADDING } from './gridLayoutService';

/**
 * Checks if a candidate position collides with any existing node.
 * Two rectangles overlap when they share both X and Y range.
 */
function collidesWithAny(
    x: number,
    y: number,
    width: number,
    height: number,
    nodes: CanvasNode[]
): boolean {
    for (const node of nodes) {
        const nw = node.width ?? DEFAULT_NODE_WIDTH;
        const nh = node.height ?? DEFAULT_NODE_HEIGHT;
        const overlapX = x < node.position.x + nw && x + width > node.position.x;
        const overlapY = y < node.position.y + nh && y + height > node.position.y;
        if (overlapX && overlapY) return true;
    }
    return false;
}

const MAX_COLLISION_ITERATIONS = 200;

/**
 * Resolves collisions by shifting Y down in increments until clear.
 * Capped at MAX_COLLISION_ITERATIONS to prevent infinite loops in pathological layouts.
 */
function resolveCollision(
    x: number,
    startY: number,
    nodes: CanvasNode[]
): NodePosition {
    let y = startY;
    const width = DEFAULT_NODE_WIDTH;
    const height = DEFAULT_NODE_HEIGHT;
    let iterations = 0;
    while (collidesWithAny(x, y, width, height, nodes) && iterations < MAX_COLLISION_ITERATIONS) {
        y += DEFAULT_NODE_HEIGHT + GRID_GAP;
        iterations++;
    }
    return { x, y };
}

/**
 * Calculates placement for a new node in free-flow mode.
 * Places to the right of the focused or most-recently-created node.
 * Falls back to grid padding origin on empty canvas.
 */
export function calculateSmartPlacement(
    nodes: CanvasNode[],
    focusedNodeId?: string
): NodePosition {
    if (nodes.length === 0) {
        return { x: GRID_PADDING, y: GRID_PADDING };
    }

    const anchor = focusedNodeId
        ? getNodeMap(nodes).get(focusedNodeId)
        : [...nodes].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

    if (!anchor) {
        return { x: GRID_PADDING, y: GRID_PADDING };
    }

    const anchorWidth = anchor.width ?? DEFAULT_NODE_WIDTH;
    const targetX = anchor.position.x + anchorWidth + GRID_GAP;
    const targetY = anchor.position.y;

    return resolveCollision(targetX, targetY, nodes);
}

/**
 * Calculates placement for a branch node in free-flow mode.
 * Places to the right of the source node, stacking vertically on collision.
 */
export function calculateBranchPlacement(
    sourceNode: CanvasNode,
    existingNodes: CanvasNode[]
): NodePosition {
    const sourceWidth = sourceNode.width ?? DEFAULT_NODE_WIDTH;
    const targetX = sourceNode.position.x + sourceWidth + GRID_GAP;
    const targetY = sourceNode.position.y;

    const others = existingNodes.filter((n) => n.id !== sourceNode.id);
    return resolveCollision(targetX, targetY, others);
}
