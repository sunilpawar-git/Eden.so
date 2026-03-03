import { describe, it, expect } from 'vitest';
import { computeBoundingBox, normalizePositions } from '../radarHelpers';
import type { NodePosition } from '../../types/node';

describe('computeBoundingBox', () => {
    it('returns null for empty array', () => {
        expect(computeBoundingBox([])).toBeNull();
    });

    it('returns exact position for a single node', () => {
        const positions: NodePosition[] = [{ x: 100, y: 200 }];
        expect(computeBoundingBox(positions)).toEqual({
            minX: 100, minY: 200, maxX: 100, maxY: 200,
        });
    });

    it('computes correct bounding box for multiple nodes', () => {
        const positions: NodePosition[] = [
            { x: 10, y: 20 },
            { x: 300, y: 50 },
            { x: 150, y: 400 },
        ];
        expect(computeBoundingBox(positions)).toEqual({
            minX: 10, minY: 20, maxX: 300, maxY: 400,
        });
    });

    it('handles negative coordinates', () => {
        const positions: NodePosition[] = [
            { x: -100, y: -200 },
            { x: 50, y: 30 },
        ];
        expect(computeBoundingBox(positions)).toEqual({
            minX: -100, minY: -200, maxX: 50, maxY: 30,
        });
    });
});

describe('normalizePositions', () => {
    const SIZE = 32;

    it('centers a single node', () => {
        const positions: NodePosition[] = [{ x: 500, y: 500 }];
        const bbox = computeBoundingBox(positions)!;
        const dots = normalizePositions(positions, bbox, SIZE);

        expect(dots).toHaveLength(1);
        expect(dots[0]!.x).toBe(SIZE / 2);
        expect(dots[0]!.y).toBe(SIZE / 2);
    });

    it('centers all nodes when stacked at same position', () => {
        const positions: NodePosition[] = [
            { x: 100, y: 200 },
            { x: 100, y: 200 },
        ];
        const bbox = computeBoundingBox(positions)!;
        const dots = normalizePositions(positions, bbox, SIZE);

        expect(dots).toHaveLength(2);
        dots.forEach((dot) => {
            expect(dot.x).toBe(SIZE / 2);
            expect(dot.y).toBe(SIZE / 2);
        });
    });

    it('maps two nodes along horizontal axis', () => {
        const positions: NodePosition[] = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
        ];
        const bbox = computeBoundingBox(positions)!;
        const dots = normalizePositions(positions, bbox, SIZE);

        expect(dots).toHaveLength(2);
        // First dot should be at left padding, second at right padding
        expect(dots[0]!.x).toBeLessThan(dots[1]!.x);
        // Both should be vertically centered
        expect(dots[0]!.y).toBe(dots[1]!.y);
    });

    it('keeps all dots within bounds (with padding)', () => {
        const positions: NodePosition[] = [
            { x: -500, y: -300 },
            { x: 800, y: 600 },
            { x: 0, y: 0 },
        ];
        const bbox = computeBoundingBox(positions)!;
        const dots = normalizePositions(positions, bbox, SIZE);

        dots.forEach((dot) => {
            expect(dot.x).toBeGreaterThanOrEqual(0);
            expect(dot.x).toBeLessThanOrEqual(SIZE);
            expect(dot.y).toBeGreaterThanOrEqual(0);
            expect(dot.y).toBeLessThanOrEqual(SIZE);
        });
    });

    it('preserves aspect ratio for non-square bounding box', () => {
        // Wide bounding box (200 x 100)
        const positions: NodePosition[] = [
            { x: 0, y: 0 },
            { x: 200, y: 100 },
        ];
        const bbox = computeBoundingBox(positions)!;
        const dots = normalizePositions(positions, bbox, SIZE);

        // Horizontal span should be larger than vertical span
        const dx = Math.abs(dots[1]!.x - dots[0]!.x);
        const dy = Math.abs(dots[1]!.y - dots[0]!.y);
        expect(dx).toBeGreaterThan(dy);
        // Aspect ratio preserved: dx/dy ≈ 200/100 = 2
        expect(dx / dy).toBeCloseTo(2, 1);
    });
});
