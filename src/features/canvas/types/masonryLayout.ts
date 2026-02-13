/**
 * Masonry Layout Types - Models for neighbor-aware layout algorithm
 * Used by gridLayoutService.ts for true masonry positioning
 */
import type { CanvasNode } from './node';

/**
 * Represents a node's placement within the masonry layout
 * Includes computed position and column assignment
 */
export interface NodePlacement {
    /** Reference to the original node */
    node: CanvasNode;
    /** Assigned column index (0 to GRID_COLUMNS-1) */
    column: number;
    /** Computed X position */
    x: number;
    /** Computed Y position */
    y: number;
    /** Node width (from node or default) */
    width: number;
    /** Node height (from node or default) */
    height: number;
}

/**
 * Represents a vertical stack of nodes within a single column
 * Nodes are ordered top-to-bottom by Y position
 */
export interface ColumnStack {
    /** Column index (0 to GRID_COLUMNS-1) */
    columnIndex: number;
    /** Nodes in this column, ordered top-to-bottom */
    placements: NodePlacement[];
}

/**
 * Complete masonry layout model containing all column stacks
 * Used for neighbor-aware X positioning calculations
 */
export interface MasonryLayoutModel {
    /** Map of column index to column stack */
    columns: Map<number, ColumnStack>;
    /** Total number of columns in the layout */
    columnCount: number;
}

/**
 * Result of checking vertical overlap between two nodes
 */
export interface OverlapResult {
    /** Whether the nodes overlap vertically */
    overlaps: boolean;
    /** Amount of vertical overlap in pixels (0 if no overlap) */
    overlapAmount: number;
}

/**
 * Checks if two vertical ranges overlap
 * @param y1 - Start Y of first range
 * @param h1 - Height of first range
 * @param y2 - Start Y of second range
 * @param h2 - Height of second range
 * @returns OverlapResult with overlap status and amount
 */
export function checkVerticalOverlap(
    y1: number,
    h1: number,
    y2: number,
    h2: number
): OverlapResult {
    const top1 = y1;
    const bottom1 = y1 + h1;
    const top2 = y2;
    const bottom2 = y2 + h2;

    const overlapStart = Math.max(top1, top2);
    const overlapEnd = Math.min(bottom1, bottom2);
    const overlapAmount = Math.max(0, overlapEnd - overlapStart);

    return {
        overlaps: overlapAmount > 0,
        overlapAmount,
    };
}

/**
 * Finds all nodes in a column that vertically overlap with a given Y range
 * @param stack - Column stack to search
 * @param y - Y position of the range
 * @param height - Height of the range
 * @returns Array of overlapping placements
 */
export function findOverlappingNeighbors(
    stack: ColumnStack,
    y: number,
    height: number
): NodePlacement[] {
    return stack.placements.filter((placement) => {
        const result = checkVerticalOverlap(y, height, placement.y, placement.height);
        return result.overlaps;
    });
}

/**
 * Calculates the default X position for a column (used when no neighbors overlap)
 * @param columnIndex - The column index
 * @param defaultWidth - Default node width
 * @param gap - Gap between columns
 * @param padding - Left padding
 * @returns Default X position for the column
 */
export function getDefaultColumnX(
    columnIndex: number,
    defaultWidth: number,
    gap: number,
    padding: number
): number {
    return padding + columnIndex * (defaultWidth + gap);
}
