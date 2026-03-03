/**
 * Radar Helpers — Pure functions for canvas radar coordinate mapping.
 * Zero React / zero store dependencies. Fully unit-testable.
 */
import type { NodePosition } from '../types/node';

/** Axis-aligned bounding box for a set of node positions */
export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/** A position normalized into the radar's coordinate space (0..size) */
export interface RadarDot {
    x: number;
    y: number;
}

/** Padding ratio applied inside the squircle to prevent dots touching edges */
const PADDING_RATIO = 0.15;

/**
 * Computes the axis-aligned bounding box for an array of node positions.
 * Returns `null` when the array is empty (no nodes = no radar dots).
 */
export function computeBoundingBox(positions: readonly NodePosition[]): BoundingBox | null {
    if (positions.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pos of positions) {
        if (pos.x < minX) minX = pos.x;
        if (pos.y < minY) minY = pos.y;
        if (pos.x > maxX) maxX = pos.x;
        if (pos.y > maxY) maxY = pos.y;
    }

    return { minX, minY, maxX, maxY };
}

/**
 * Normalizes node positions into the radar's squircle coordinate space.
 *
 * Maps the bounding box into `[padding .. size - padding]`, preserving
 * aspect ratio. A single node is centered at `size / 2`.
 */
export function normalizePositions(
    positions: readonly NodePosition[],
    bbox: BoundingBox,
    size: number,
): RadarDot[] {
    const pad = size * PADDING_RATIO;
    const usable = size - 2 * pad;

    const bboxW = bbox.maxX - bbox.minX;
    const bboxH = bbox.maxY - bbox.minY;

    // Single node or all nodes stacked → center the dot
    if (bboxW === 0 && bboxH === 0) {
        const center = size / 2;
        return positions.map(() => ({ x: center, y: center }));
    }

    // Scale uniformly to fit the larger axis, preserving aspect ratio
    const scale = usable / Math.max(bboxW, bboxH);

    // Offset so the shorter axis is centered
    const scaledW = bboxW * scale;
    const scaledH = bboxH * scale;
    const offsetX = pad + (usable - scaledW) / 2;
    const offsetY = pad + (usable - scaledH) / 2;

    return positions.map((pos) => ({
        x: offsetX + (pos.x - bbox.minX) * scale,
        y: offsetY + (pos.y - bbox.minY) * scale,
    }));
}
