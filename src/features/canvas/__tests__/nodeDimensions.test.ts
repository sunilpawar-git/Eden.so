/**
 * Node Dimension Tests - TDD: Write tests FIRST
 * Tests for dimension constants and clampNodeDimensions utility
 */
import { describe, it, expect } from 'vitest';
import {
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH,
    MIN_NODE_HEIGHT,
    MAX_NODE_HEIGHT,
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
    clampNodeDimensions,
} from '../types/node';

describe('Node Dimension Constants', () => {
    it('MIN_NODE_WIDTH should be 180', () => {
        expect(MIN_NODE_WIDTH).toBe(180);
    });

    it('MAX_NODE_WIDTH should be 900', () => {
        expect(MAX_NODE_WIDTH).toBe(900);
    });

    it('MIN_NODE_HEIGHT should be 100', () => {
        expect(MIN_NODE_HEIGHT).toBe(100);
    });

    it('MAX_NODE_HEIGHT should be 800', () => {
        expect(MAX_NODE_HEIGHT).toBe(800);
    });

    it('DEFAULT_NODE_WIDTH should be within min/max bounds', () => {
        expect(DEFAULT_NODE_WIDTH).toBeGreaterThanOrEqual(MIN_NODE_WIDTH);
        expect(DEFAULT_NODE_WIDTH).toBeLessThanOrEqual(MAX_NODE_WIDTH);
    });

    it('DEFAULT_NODE_HEIGHT should be within min/max bounds', () => {
        expect(DEFAULT_NODE_HEIGHT).toBeGreaterThanOrEqual(MIN_NODE_HEIGHT);
        expect(DEFAULT_NODE_HEIGHT).toBeLessThanOrEqual(MAX_NODE_HEIGHT);
    });
});

describe('clampNodeDimensions', () => {
    it('should clamp width below minimum to MIN_NODE_WIDTH', () => {
        const result = clampNodeDimensions(100, 200);
        expect(result.width).toBe(MIN_NODE_WIDTH);
    });

    it('should clamp width above maximum to MAX_NODE_WIDTH', () => {
        const result = clampNodeDimensions(1500, 200);
        expect(result.width).toBe(MAX_NODE_WIDTH);
    });

    it('should clamp height below minimum to MIN_NODE_HEIGHT', () => {
        const result = clampNodeDimensions(300, 50);
        expect(result.height).toBe(MIN_NODE_HEIGHT);
    });

    it('should clamp height above maximum to MAX_NODE_HEIGHT', () => {
        const result = clampNodeDimensions(300, 1000);
        expect(result.height).toBe(MAX_NODE_HEIGHT);
    });

    it('should return original dimensions when within bounds', () => {
        const result = clampNodeDimensions(400, 300);
        expect(result.width).toBe(400);
        expect(result.height).toBe(300);
    });

    it('should clamp both width and height simultaneously', () => {
        const result = clampNodeDimensions(50, 1000);
        expect(result.width).toBe(MIN_NODE_WIDTH);
        expect(result.height).toBe(MAX_NODE_HEIGHT);
    });

    it('should handle exact boundary values', () => {
        const minResult = clampNodeDimensions(MIN_NODE_WIDTH, MIN_NODE_HEIGHT);
        expect(minResult.width).toBe(MIN_NODE_WIDTH);
        expect(minResult.height).toBe(MIN_NODE_HEIGHT);

        const maxResult = clampNodeDimensions(MAX_NODE_WIDTH, MAX_NODE_HEIGHT);
        expect(maxResult.width).toBe(MAX_NODE_WIDTH);
        expect(maxResult.height).toBe(MAX_NODE_HEIGHT);
    });
});
