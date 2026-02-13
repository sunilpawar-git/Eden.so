/**
 * Image Validator Tests
 * TDD: Validates image MIME type checking, size limits, and response validation
 */
import { describe, it, expect } from 'vitest';
import {
    isAllowedImageType,
    isWithinSizeLimit,
    validateImageResponse,
} from '../imageValidator.js';

describe('imageValidator', () => {
    describe('isAllowedImageType', () => {
        it('allows image/png', () => {
            expect(isAllowedImageType('image/png')).toBe(true);
        });

        it('allows image/jpeg', () => {
            expect(isAllowedImageType('image/jpeg')).toBe(true);
        });

        it('allows image/gif', () => {
            expect(isAllowedImageType('image/gif')).toBe(true);
        });

        it('allows image/webp', () => {
            expect(isAllowedImageType('image/webp')).toBe(true);
        });

        it('rejects image/svg+xml (XSS vector)', () => {
            expect(isAllowedImageType('image/svg+xml')).toBe(false);
        });

        it('allows content-type with charset parameter', () => {
            expect(isAllowedImageType('image/png; charset=utf-8')).toBe(true);
        });

        it('rejects text/html', () => {
            expect(isAllowedImageType('text/html')).toBe(false);
        });

        it('rejects application/javascript', () => {
            expect(isAllowedImageType('application/javascript')).toBe(false);
        });

        it('rejects null content-type', () => {
            expect(isAllowedImageType(null)).toBe(false);
        });

        it('rejects empty string', () => {
            expect(isAllowedImageType('')).toBe(false);
        });

        it('rejects application/octet-stream', () => {
            expect(isAllowedImageType('application/octet-stream')).toBe(false);
        });
    });

    describe('isWithinSizeLimit', () => {
        it('returns true for null content-length (unknown)', () => {
            expect(isWithinSizeLimit(null)).toBe(true);
        });

        it('returns true for size within limit', () => {
            expect(isWithinSizeLimit('1000')).toBe(true);
        });

        it('returns true for size exactly at limit', () => {
            expect(isWithinSizeLimit('5242880')).toBe(true);
        });

        it('returns false for size exceeding limit', () => {
            expect(isWithinSizeLimit('10000000')).toBe(false);
        });

        it('respects custom max bytes parameter', () => {
            expect(isWithinSizeLimit('500', 400)).toBe(false);
            expect(isWithinSizeLimit('300', 400)).toBe(true);
        });
    });

    describe('validateImageResponse', () => {
        it('passes for valid image with acceptable size', () => {
            const result = validateImageResponse('image/jpeg', '50000');
            expect(result.valid).toBe(true);
        });

        it('fails for non-image content-type', () => {
            const result = validateImageResponse('text/html', '1000');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not a valid image');
        });

        it('fails for oversized image', () => {
            const result = validateImageResponse('image/png', '10000000');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('maximum size');
        });

        it('passes when content-length is unknown', () => {
            const result = validateImageResponse('image/webp', null);
            expect(result.valid).toBe(true);
        });
    });
});
