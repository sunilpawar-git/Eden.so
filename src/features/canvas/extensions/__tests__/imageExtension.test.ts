/**
 * Image Extension Tests — Validates TipTap Image configuration and URL safety
 */
import { describe, it, expect } from 'vitest';
import { isSafeImageSrc, NodeImage } from '../imageExtension';

describe('isSafeImageSrc', () => {
    it('accepts HTTPS URLs', () => {
        expect(isSafeImageSrc('https://cdn.example.com/photo.jpg')).toBe(true);
    });

    it('accepts data:image/ base64 URLs', () => {
        expect(isSafeImageSrc('data:image/jpeg;base64,/9j/4A==')).toBe(true);
        expect(isSafeImageSrc('data:image/png;base64,iVBOR')).toBe(true);
    });

    it('rejects javascript: URLs', () => {
        expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
    });

    it('rejects data:text/html URLs (XSS vector)', () => {
        expect(isSafeImageSrc('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('rejects HTTP URLs (insecure)', () => {
        expect(isSafeImageSrc('http://example.com/img.png')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isSafeImageSrc('')).toBe(false);
    });

    it('rejects malformed URLs', () => {
        expect(isSafeImageSrc('not-a-url')).toBe(false);
    });

    it('rejects blob: URLs', () => {
        expect(isSafeImageSrc('blob:http://example.com/uuid')).toBe(false);
    });
});

describe('NodeImage extension', () => {
    it('is named "image"', () => {
        expect(NodeImage.name).toBe('image');
    });

    it('is configured as block-level (not inline)', () => {
        expect(NodeImage.options.inline).toBe(false);
    });

    it('allows base64 images', () => {
        expect(NodeImage.options.allowBase64).toBe(true);
    });

    it('has resize enabled with aspect ratio preservation', () => {
        const resize = NodeImage.options.resize;
        expect(resize).not.toBe(false);
        expect(typeof resize === 'object' && resize.enabled).toBe(true);
        expect(typeof resize === 'object' && resize.alwaysPreserveAspectRatio).toBe(true);
    });
});
