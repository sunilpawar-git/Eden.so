/**
 * Masonry Layout Types Tests
 * Tests for the type utilities in masonryLayout.ts
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_NODE_WIDTH } from '../../types/node';
import {
    checkVerticalOverlap,
    findOverlappingNeighbors,
    getDefaultColumnX,
    type ColumnStack,
} from '../../types/masonryLayout';
import { GRID_GAP, GRID_PADDING } from '../gridLayoutService';
import { createMockPlacement } from './masonryTestHelpers';

describe('Masonry Layout Types', () => {
    describe('checkVerticalOverlap', () => {
        it('should detect overlap when ranges intersect', () => {
            const result = checkVerticalOverlap(0, 100, 50, 100);
            expect(result.overlaps).toBe(true);
            expect(result.overlapAmount).toBe(50);
        });

        it('should detect no overlap when ranges are separate', () => {
            const result = checkVerticalOverlap(0, 100, 200, 100);
            expect(result.overlaps).toBe(false);
            expect(result.overlapAmount).toBe(0);
        });

        it('should detect no overlap when ranges touch at edge', () => {
            const result = checkVerticalOverlap(0, 100, 100, 100);
            expect(result.overlaps).toBe(false);
            expect(result.overlapAmount).toBe(0);
        });

        it('should detect full containment as overlap', () => {
            const result = checkVerticalOverlap(0, 200, 50, 50);
            expect(result.overlaps).toBe(true);
            expect(result.overlapAmount).toBe(50);
        });
    });

    describe('findOverlappingNeighbors', () => {
        it('should find nodes that overlap vertically', () => {
            const stack: ColumnStack = {
                columnIndex: 0,
                placements: [
                    createMockPlacement('n1', 0, 32, 32, 280, 220),
                    createMockPlacement('n2', 0, 32, 292, 280, 220),
                    createMockPlacement('n3', 0, 32, 552, 280, 220),
                ],
            };

            // Query for Y=200, height=200 -> should overlap with n1 (32-252) and n2 (292-512)
            const overlapping = findOverlappingNeighbors(stack, 200, 200);
            expect(overlapping.map((p) => p.node.id)).toEqual(['n1', 'n2']);
        });

        it('should return empty array when no overlaps', () => {
            const stack: ColumnStack = {
                columnIndex: 0,
                placements: [createMockPlacement('n1', 0, 32, 32, 280, 100)],
            };

            const overlapping = findOverlappingNeighbors(stack, 500, 100);
            expect(overlapping).toEqual([]);
        });
    });

    describe('getDefaultColumnX', () => {
        it('should calculate default X for column 0', () => {
            const x = getDefaultColumnX(0, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
            expect(x).toBe(GRID_PADDING);
        });

        it('should calculate default X for column 1', () => {
            const x = getDefaultColumnX(1, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
            expect(x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP);
        });

        it('should calculate default X for column 3', () => {
            const x = getDefaultColumnX(3, DEFAULT_NODE_WIDTH, GRID_GAP, GRID_PADDING);
            const expected = GRID_PADDING + 3 * (DEFAULT_NODE_WIDTH + GRID_GAP);
            expect(x).toBe(expected);
        });
    });
});
