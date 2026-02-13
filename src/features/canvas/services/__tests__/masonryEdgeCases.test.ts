/**
 * Masonry Layout Edge Case Tests (Phase 4)
 * Tests edge cases for the masonry layout algorithm
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_NODE_WIDTH } from '../../types/node';
import {
    arrangeMasonry,
    calculateMasonryPosition,
    GRID_PADDING,
    GRID_GAP,
} from '../gridLayoutService';
import { createMockNode } from './masonryTestHelpers';

describe('Masonry Layout Edge Cases', () => {
    it('empty canvas returns empty array', () => {
        const result = arrangeMasonry([]);
        expect(result).toEqual([]);
    });

    it('single node stays at padding origin', () => {
        const nodes = [createMockNode('n0', { createdAt: new Date('2024-01-01') })];
        const arranged = arrangeMasonry(nodes);

        expect(arranged).toHaveLength(1);
        expect(arranged[0]?.position.x).toBe(GRID_PADDING);
        expect(arranged[0]?.position.y).toBe(GRID_PADDING);
    });

    it('all nodes same size produces classic grid', () => {
        const nodes = [
            createMockNode('n0', { createdAt: new Date('2024-01-01') }),
            createMockNode('n1', { createdAt: new Date('2024-01-02') }),
            createMockNode('n2', { createdAt: new Date('2024-01-03') }),
            createMockNode('n3', { createdAt: new Date('2024-01-04') }),
        ];

        const arranged = arrangeMasonry(nodes);

        // All in row 0, different columns
        expect(arranged[0]?.position.x).toBe(GRID_PADDING);
        expect(arranged[1]?.position.x).toBe(GRID_PADDING + DEFAULT_NODE_WIDTH + GRID_GAP);
        expect(arranged[2]?.position.x).toBe(GRID_PADDING + 2 * (DEFAULT_NODE_WIDTH + GRID_GAP));
        expect(arranged[3]?.position.x).toBe(GRID_PADDING + 3 * (DEFAULT_NODE_WIDTH + GRID_GAP));
        // All at same Y
        arranged.forEach((n) => expect(n.position.y).toBe(GRID_PADDING));
    });

    it('max-width node in column still works', () => {
        const MAX_WIDTH = 900;
        const nodes = [
            createMockNode('n0', { width: MAX_WIDTH, createdAt: new Date('2024-01-01') }),
            createMockNode('n1', { createdAt: new Date('2024-01-02') }),
        ];

        const arranged = arrangeMasonry(nodes);

        // n0 at padding
        expect(arranged[0]?.position.x).toBe(GRID_PADDING);
        // n1 shifted right significantly due to overlap
        expect(arranged[1]?.position.x).toBe(GRID_PADDING + MAX_WIDTH + GRID_GAP);
    });

    it('calculateMasonryPosition returns padding for empty canvas', () => {
        const position = calculateMasonryPosition([]);
        expect(position.x).toBe(GRID_PADDING);
        expect(position.y).toBe(GRID_PADDING);
    });
});
