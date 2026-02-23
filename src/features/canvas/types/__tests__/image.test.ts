/**
 * Image Types Tests — Validates constants for node image uploads
 */
import { describe, it, expect } from 'vitest';
import {
    IMAGE_ACCEPTED_MIME_TYPES,
    IMAGE_MAX_FILE_SIZE,
} from '../image';

describe('Image Constants', () => {
    it('allows JPEG, PNG, GIF, and WebP MIME types', () => {
        expect(IMAGE_ACCEPTED_MIME_TYPES).toContain('image/jpeg');
        expect(IMAGE_ACCEPTED_MIME_TYPES).toContain('image/png');
        expect(IMAGE_ACCEPTED_MIME_TYPES).toContain('image/gif');
        expect(IMAGE_ACCEPTED_MIME_TYPES).toContain('image/webp');
    });

    it('does not allow non-image MIME types', () => {
        const types = IMAGE_ACCEPTED_MIME_TYPES as readonly string[];
        expect(types).not.toContain('text/html');
        expect(types).not.toContain('application/pdf');
        expect(types).not.toContain('image/svg+xml');
    });

    it('sets max file size to 5 MB', () => {
        expect(IMAGE_MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });
});
