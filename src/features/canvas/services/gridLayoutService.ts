/**
 * Grid Layout Service - Logic for Masonry Layout
 * Handles variable node heights and widths by stacking in the shortest column.
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';

// Constants (matches canvasStoreHelpers.ts)
export const GRID_COLUMNS = 4;
export const GRID_GAP = 40;
export const GRID_PADDING = 32;

/**
 * Finds the index of the shortest column.
 */
function findShortestColumn(columnY: number[]): number {
    let minCol = 0;
    let minHeight = columnY[0]!;
    for (let i = 1; i < columnY.length; i++) {
        if (columnY[i]! < minHeight) {
            minHeight = columnY[i]!;
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
function assignNodesToColumns(
    sortedNodes: CanvasNode[]
): ColumnAssignment[] {
    const columnY: number[] = new Array<number>(GRID_COLUMNS).fill(GRID_PADDING);
    const assignments: ColumnAssignment[] = [];

    for (const node of sortedNodes) {
        const col = findShortestColumn(columnY);
        assignments.push({ node, column: col });
        const height = node.height ?? DEFAULT_NODE_HEIGHT;
        columnY[col]! += height + GRID_GAP;
    }

    return assignments;
}

/**
 * Computes the maximum width for each column based on assigned nodes.
 */
function computeColumnWidths(
    assignments: ColumnAssignment[]
): number[] {
    const columnWidths: number[] = new Array<number>(GRID_COLUMNS).fill(DEFAULT_NODE_WIDTH);

    for (const { node, column } of assignments) {
        const width = node.width ?? DEFAULT_NODE_WIDTH;
        if (width > columnWidths[column]!) {
            columnWidths[column] = width;
        }
    }

    return columnWidths;
}

/**
 * Computes x-positions for each column based on flexible widths.
 */
function computeColumnXPositions(columnWidths: number[]): number[] {
    const xPositions: number[] = [];
    let x = GRID_PADDING;

    for (let i = 0; i < GRID_COLUMNS; i++) {
        xPositions.push(x);
        x += columnWidths[i]! + GRID_GAP;
    }

    return xPositions;
}

/**
 * Calculates the next position in a Masonry layout.
 * Finds the shortest column and stacks that place.
 */
export function calculateMasonryPosition(nodes: CanvasNode[]): NodePosition {
    // Sort nodes by creation date
    const sorted = [...nodes].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Pass 1: Assign nodes to columns
    const assignments = assignNodesToColumns(sorted);

    // Pass 2: Compute column widths
    const columnWidths = computeColumnWidths(assignments);

    // Pass 3: Compute x-positions
    const columnX = computeColumnXPositions(columnWidths);

    // Rebuild column heights to find target
    const columnY: number[] = new Array(GRID_COLUMNS).fill(GRID_PADDING);
    for (const { node, column } of assignments) {
        const height = node.height ?? DEFAULT_NODE_HEIGHT;
        columnY[column]! += height + GRID_GAP;
    }

    // Find shortest column for new node
    const targetCol = findShortestColumn(columnY);

    return {
        x: columnX[targetCol]!,
        y: columnY[targetCol]!,
    };
}

/**
 * Rearranges all nodes using the Masonry logic with flexible column widths.
 * Two-pass algorithm:
 *   Pass 1: Assign nodes to columns (shortest-first)
 *   Pass 2: Compute max width per column
 *   Pass 3: Compute final x-positions and place nodes
 */
export function arrangeMasonry(nodes: CanvasNode[]): CanvasNode[] {
    if (nodes.length === 0) return [];

    // Sort by creation date
    const sorted = [...nodes].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Pass 1: Assign nodes to columns
    const assignments = assignNodesToColumns(sorted);

    // Pass 2: Compute column widths
    const columnWidths = computeColumnWidths(assignments);

    // Pass 3: Compute x-positions
    const columnX = computeColumnXPositions(columnWidths);

    // Final pass: Assign positions to each node
    const columnY: number[] = new Array(GRID_COLUMNS).fill(GRID_PADDING);

    return assignments.map(({ node, column }) => {
        const x = columnX[column]!;
        const y = columnY[column]!;

        const height = node.height ?? DEFAULT_NODE_HEIGHT;
        columnY[column]! += height + GRID_GAP;

        return {
            ...node,
            position: { x, y },
            updatedAt: new Date(),
        };
    });
}
