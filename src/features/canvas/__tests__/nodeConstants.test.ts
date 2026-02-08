/**
 * Node Constants Tests - TDD for RESIZE_INCREMENT_PX
 * Validates resize increment constant properties
 */
import { describe, it, expect } from 'vitest';
import {
    RESIZE_INCREMENT_PX,
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH,
    MIN_NODE_HEIGHT,
    MAX_NODE_HEIGHT,
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
} from '../types/node';

describe('RESIZE_INCREMENT_PX', () => {
    it('should be 96px (1 CSS inch = 6 grid snaps)', () => {
        expect(RESIZE_INCREMENT_PX).toBe(96);
    });

    it('should be divisible by grid snap (16px)', () => {
        const GRID_SNAP = 16;
        expect(RESIZE_INCREMENT_PX % GRID_SNAP).toBe(0);
    });

    it('should allow at least 2 width increments from default', () => {
        expect(DEFAULT_NODE_WIDTH + RESIZE_INCREMENT_PX * 2).toBeLessThanOrEqual(MAX_NODE_WIDTH);
    });

    it('should allow at least 2 height increments from default', () => {
        expect(DEFAULT_NODE_HEIGHT + RESIZE_INCREMENT_PX * 2).toBeLessThanOrEqual(MAX_NODE_HEIGHT);
    });

    it('should not exceed max width with maximum possible increments', () => {
        const maxIncrements = Math.floor((MAX_NODE_WIDTH - MIN_NODE_WIDTH) / RESIZE_INCREMENT_PX);
        expect(MIN_NODE_WIDTH + maxIncrements * RESIZE_INCREMENT_PX).toBeLessThanOrEqual(MAX_NODE_WIDTH);
    });

    it('should not exceed max height with maximum possible increments', () => {
        const maxIncrements = Math.floor((MAX_NODE_HEIGHT - MIN_NODE_HEIGHT) / RESIZE_INCREMENT_PX);
        expect(MIN_NODE_HEIGHT + maxIncrements * RESIZE_INCREMENT_PX).toBeLessThanOrEqual(MAX_NODE_HEIGHT);
    });
});
