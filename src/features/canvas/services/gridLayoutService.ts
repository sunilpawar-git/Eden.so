/**
 * Grid Layout Service - Logic for Masonry Layout
 * Neighbor-aware algorithm: nodes only shift when they vertically overlap with wider neighbors
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import type { ColumnStack, NodePlacement } from '../types/masonryLayout';
import { checkVerticalOverlap, getDefaultColumnX } from '../types/masonryLayout';

// Constants (matches canvasStoreHelpers.ts)
export const GRID_COLUMNS = 4;
export const GRID_GAP = 40;
export const GRID_PADDING = 32;

/**
 * Finds the index of the shortest column.
 */
function findShortestColumn(columnY: number[]): number {
    let minCol = 0;
    let minHeight = columnY[0] ?? GRID_PADDING;
    for (let i = 1; i < columnY.length; i++) {
        const height = columnY[i] ?? GRID_PADDING;
        if (height < minHeight) {
            minHeight = height;
            minCol = i;
        }
    }
    return minCol;
}

/** Column assignment result */
interface ColumnAssignment {
    node: CanvasNode;
    column: number;
}

/**
 * Assigns each node to a column using shortest-column logic.
 * Returns array of column assignment pairs in placement order.
 */
function assignNodesToColumns(sortedNodes: CanvasNode[]): ColumnAssignment[] {
    const columnY: number[] = new Array<number>(GRID_COLUMNS).fill(GRID_PADDING);
    const assignments: ColumnAssignment[] = [];

    for (const node of sortedNodes) {
        const col = findShortestColumn(columnY);
        assignments.push({ node, column: col });
        const height = node.height ?? DEFAULT_NODE_HEIGHT;
        const colY = columnY[col] ?? GRID_PADDING;
        columnY[col] = colY + height + GRID_GAP;
    }

    return assignments;
}

/**
 * Builds column stacks from assignments with computed Y positions.
 * Each stack contains placements ordered top-to-bottom.
 */
function buildColumnStacks(assignments: ColumnAssignment[]): Map<number, ColumnStack> {
    const stacks = new Map<number, ColumnStack>();

    // Initialize empty stacks for all columns
    for (let i = 0; i < GRID_COLUMNS; i++) {
        stacks.set(i, { columnIndex: i, placements: [] });
    }

    // Group assignments by column and compute Y positions
    const columnY: number[] = new Array<number>(GRID_COLUMNS).fill(GRID_PADDING);

    for (const { node, column } of assignments) {
        const width = node.width ?? DEFAULT_NODE_WIDTH;
        const height = node.height ?? DEFAULT_NODE_HEIGHT;
        const y = columnY[column] ?? GRID_PADDING;

        const placement: NodePlacement = {
            node,
            column,
            x: 0, // Will be computed in next pass
            y,
            width,
            height,
        };

        const stack = stacks.get(column);
        if (stack) {
            stack.placements.push(placement);
        }

        columnY[column] = y + height + GRID_GAP;
    }

    return stacks;
}

/**
 * Finds overlapping neighbors in the previous column for a given placement.
 * Returns the maximum right edge (x + width) of overlapping neighbors.
 */
function findMaxRightEdgeOfOverlappingNeighbors(
    leftStack: ColumnStack | undefined,
    y: number,
    height: number
): number | null {
    if (!leftStack || leftStack.placements.length === 0) {
        return null;
    }

    let maxRightEdge: number | null = null;

    for (const neighbor of leftStack.placements) {
        const overlap = checkVerticalOverlap(y, height, neighbor.y, neighbor.height);
        if (overlap.overlaps) {
            const rightEdge = neighbor.x + neighbor.width;
            if (maxRightEdge === null || rightEdge > maxRightEdge) {
                maxRightEdge = rightEdge;
            }
        }
    }

    return maxRightEdge;
}

/**
 * Computes neighbor-aware X positions for all placements.
 * Column 0 always starts at GRID_PADDING.
 * Other columns use max right edge of overlapping neighbors + GAP,
 * or default column X if no overlaps.
 */
function computeNeighborAwareX(stacks: Map<number, ColumnStack>): void {
    // Column 0: all nodes at GRID_PADDING
    const col0 = stacks.get(0);
    if (col0) {
        for (const placement of col0.placements) {
            placement.x = GRID_PADDING;
        }
    }

    // Columns 1-3: compute based on overlapping neighbors
    for (let colIdx = 1; colIdx < GRID_COLUMNS; colIdx++) {
        const stack = stacks.get(colIdx);
        const leftStack = stacks.get(colIdx - 1);

        if (!stack) continue;

        for (const placement of stack.placements) {
            const maxRightEdge = findMaxRightEdgeOfOverlappingNeighbors(
                leftStack,
                placement.y,
                placement.height
            );

            if (maxRightEdge !== null) {
                // Position based on overlapping neighbor's right edge
                placement.x = maxRightEdge + GRID_GAP;
            } else {
                // No overlap: use default column X position
                placement.x = getDefaultColumnX(colIdx, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
            }
        }
    }
}

/**
 * Calculates the next position in a Masonry layout.
 * Finds the shortest column and stacks that place.
 */
export function calculateMasonryPosition(nodes: CanvasNode[]): NodePosition {
    if (nodes.length === 0) {
        return { x: GRID_PADDING, y: GRID_PADDING };
    }

    // Sort nodes by creation date
    const sorted = [...nodes].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Pass 1: Assign nodes to columns
    const assignments = assignNodesToColumns(sorted);

    // Pass 2: Build column stacks with Y positions
    const stacks = buildColumnStacks(assignments);

    // Pass 3: Compute neighbor-aware X positions
    computeNeighborAwareX(stacks);

    // Find shortest column for new node
    const columnY: number[] = new Array<number>(GRID_COLUMNS).fill(GRID_PADDING);
    for (const { node, column } of assignments) {
        const height = node.height ?? DEFAULT_NODE_HEIGHT;
        const colY = columnY[column] ?? GRID_PADDING;
        columnY[column] = colY + height + GRID_GAP;
    }

    const targetCol = findShortestColumn(columnY);
    const targetY = columnY[targetCol] ?? GRID_PADDING;

    // Calculate X for new node based on overlapping neighbors
    const leftStack = stacks.get(targetCol - 1);
    const newNodeHeight = DEFAULT_NODE_HEIGHT; // New nodes use default height

    const maxRightEdge = findMaxRightEdgeOfOverlappingNeighbors(
        leftStack,
        targetY,
        newNodeHeight
    );

    const targetX = targetCol === 0
        ? GRID_PADDING
        : maxRightEdge !== null
            ? maxRightEdge + GRID_GAP
            : getDefaultColumnX(targetCol, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);

    return { x: targetX, y: targetY };
}

/**
 * Rearranges all nodes using the neighbor-aware Masonry algorithm.
 * Multi-pass algorithm:
 *   Pass 1: Assign nodes to columns (shortest-first)
 *   Pass 2: Build column stacks with Y positions
 *   Pass 3: Compute neighbor-aware X positions
 *   Pass 4: Map placements back to nodes
 */
export function arrangeMasonry(nodes: CanvasNode[]): CanvasNode[] {
    if (nodes.length === 0) return [];

    // Sort by creation date
    const sorted = [...nodes].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Pass 1: Assign nodes to columns
    const assignments = assignNodesToColumns(sorted);

    // Pass 2: Build column stacks with Y positions
    const stacks = buildColumnStacks(assignments);

    // Pass 3: Compute neighbor-aware X positions
    computeNeighborAwareX(stacks);

    // Pass 4: Create placement lookup by node ID
    const placementMap = new Map<string, NodePlacement>();
    for (const stack of stacks.values()) {
        for (const placement of stack.placements) {
            placementMap.set(placement.node.id, placement);
        }
    }

    // Map back to nodes in original assignment order
    return assignments.map(({ node }) => {
        const placement = placementMap.get(node.id);
        if (!placement) {
            // Fallback (should not happen)
            return { ...node, updatedAt: new Date() };
        }

        return {
            ...node,
            position: { x: placement.x, y: placement.y },
            updatedAt: new Date(),
        };
    });
}
