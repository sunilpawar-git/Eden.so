/**
 * Grid Layout Service - Logic for Masonry Layout
 * Handles variable node heights by stacking in the shortest column.
 */
import type { CanvasNode, NodePosition } from '../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';

// Constants (matches canvasStoreHelpers.ts)
export const GRID_COLUMNS = 4;
export const GRID_GAP = 40;
export const GRID_PADDING = 32;

/**
 * Calculates the next position in a Masonry layout.
 * Finds the shortest column and stacks that place.
 */
export function calculateMasonryPosition(nodes: CanvasNode[]): NodePosition {
    const nodeWidth = DEFAULT_NODE_WIDTH;

    // Initialize column heights with padding
    const columnY: number[] = new Array(GRID_COLUMNS).fill(GRID_PADDING);

    // Simulate placement of all existing nodes to find current column heights
    // We must sort them by createdAt to replicate the build order
    const sorted = [...nodes].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((node) => {
        // Find shortest column
        let minCol = 0;
        let minHeight = columnY[0]!;

        for (let i = 1; i < GRID_COLUMNS; i++) {
            if (columnY[i]! < minHeight) {
                minHeight = columnY[i]!;
                minCol = i;
            }
        }

        // Place node in shortest column
        // Update that column's height
        const height = node.height ?? DEFAULT_NODE_HEIGHT;
        columnY[minCol]! += height + GRID_GAP;
    });

    // Now find the shortest column for the NEW node
    let targetCol = 0;
    let targetY = columnY[0]!;

    for (let i = 1; i < GRID_COLUMNS; i++) {
        if (columnY[i]! < targetY) {
            targetY = columnY[i]!;
            targetCol = i;
        }
    }

    return {
        x: GRID_PADDING + targetCol * (nodeWidth + GRID_GAP),
        y: targetY,
    };
}

/**
 * Rearranges all nodes using the Masonry logic (shortest column first).
 */
export function arrangeMasonry(nodes: CanvasNode[]): CanvasNode[] {
    if (nodes.length === 0) return [];

    const nodeWidth = DEFAULT_NODE_WIDTH;

    // Sort by creation date
    const sorted = [...nodes].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Track current Y position for each column
    const columnY: number[] = new Array(GRID_COLUMNS).fill(GRID_PADDING);

    return sorted.map((node) => {
        // Find shortest column
        let minCol = 0;
        let minHeight = columnY[0]!;

        for (let i = 1; i < GRID_COLUMNS; i++) {
            if (columnY[i]! < minHeight) {
                minHeight = columnY[i]!;
                minCol = i;
            }
        }

        const x = GRID_PADDING + minCol * (nodeWidth + GRID_GAP);
        const y = columnY[minCol]!;

        // Update column Y tracker
        const height = node.height ?? DEFAULT_NODE_HEIGHT;
        columnY[minCol]! += height + GRID_GAP;

        return {
            ...node,
            position: { x, y },
            updatedAt: new Date(),
        };
    });
}
