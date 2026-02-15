/**
 * Image Compressor Tests — calculateDimensions utility
 * Canvas/Blob APIs cannot be tested in jsdom, so we test the pure function
 */
import { describe, it, expect } from 'vitest';
import { calculateDimensions } from '../utils/imageCompressor';

describe('calculateDimensions', () => {
    it('returns original dimensions when within limit', () => {
        expect(calculateDimensions(800, 600)).toEqual({ width: 800, height: 600 });
    });

    it('returns original dimensions at exact limit', () => {
        expect(calculateDimensions(1024, 1024)).toEqual({ width: 1024, height: 1024 });
    });

    it('scales down landscape image preserving aspect ratio', () => {
        const result = calculateDimensions(2048, 1024);
        expect(result.width).toBe(1024);
        expect(result.height).toBe(512);
    });

    it('scales down portrait image preserving aspect ratio', () => {
        const result = calculateDimensions(1024, 2048);
        expect(result.width).toBe(512);
        expect(result.height).toBe(1024);
    });

    it('scales down square image', () => {
        const result = calculateDimensions(4096, 4096);
        expect(result.width).toBe(1024);
        expect(result.height).toBe(1024);
    });

    it('handles very small images', () => {
        expect(calculateDimensions(10, 10)).toEqual({ width: 10, height: 10 });
    });
});
