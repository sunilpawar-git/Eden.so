/**
 * Synthesis Position — calculates placement for new synthesis nodes.
 * Places the node to the right of the selection bounding box, snapped to grid.
 * Uses spiral collision detection to avoid overlapping existing nodes.
 */
import type { CanvasNode, NodePosition } from '@/features/canvas/types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '@/features/canvas/types/node';
import { SNAP_GRID } from '@/features/canvas/components/canvasViewConstants';
import { findNearestOpenSlot } from '@/features/canvas/services/spiralPlacement';

const HORIZONTAL_GAP = 120;

function snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}

export function calculateSynthesisPosition(
    allNodes: readonly CanvasNode[],
    selectedIds: ReadonlySet<string>
): NodePosition {
    const selected = allNodes.filter((n) => selectedIds.has(n.id));
    if (selected.length === 0) {
        return { x: 0, y: 0 };
    }

    let maxRight = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of selected) {
        const nodeWidth = node.width ?? DEFAULT_NODE_WIDTH;
        const right = node.position.x + nodeWidth;
        if (right > maxRight) maxRight = right;
        if (node.position.y < minY) minY = node.position.y;
        const bottom = node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT);
        if (bottom > maxY) maxY = bottom;
    }

    const centerY = (minY + maxY) / 2 - DEFAULT_NODE_HEIGHT / 2;
    const idealX = snapToGrid(maxRight + HORIZONTAL_GAP, SNAP_GRID[0]);
    const idealY = snapToGrid(centerY, SNAP_GRID[1]);

    const mutableNodes = allNodes as CanvasNode[];
    return findNearestOpenSlot(
        idealX, idealY, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, mutableNodes,
    );
}
