/**
 * Image Proxy URL Builder Tests
 * TDD: Validates URL construction, encoding, and edge cases
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildProxiedImageUrl } from '../imageProxyUrl';
import { isProxyConfigured } from '@/config/linkPreviewConfig';

// Mock the config module (vi.mock is auto-hoisted above imports)
vi.mock('@/config/linkPreviewConfig', () => ({
    getProxyImageUrl: (url: string) =>
        `https://proxy.example.net/proxyImage?url=${encodeURIComponent(url)}`,
    isProxyConfigured: vi.fn().mockReturnValue(true),
}));

describe('imageProxyUrl', () => {
    beforeEach(() => {
        // Simulate production mode so proxy URLs are generated
        vi.stubEnv('DEV', false);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.mocked(isProxyConfigured).mockReturnValue(true);
    });

    describe('buildProxiedImageUrl', () => {
        it('constructs proxied URL for a basic image URL', () => {
            const result = buildProxiedImageUrl('https://example.com/image.png');
            expect(result).toBe(
                'https://proxy.example.net/proxyImage?url=https%3A%2F%2Fexample.com%2Fimage.png',
            );
        });

        it('encodes special characters in the image URL', () => {
            const result = buildProxiedImageUrl(
                'https://example.com/img?id=123&size=large',
            );
            expect(result).toContain(
                encodeURIComponent('https://example.com/img?id=123&size=large'),
            );
        });

        it('returns empty string for undefined input', () => {
            expect(buildProxiedImageUrl(undefined)).toBe('');
        });

        it('returns empty string for empty string input', () => {
            expect(buildProxiedImageUrl('')).toBe('');
        });

        it('returns original URL when proxy is not configured', () => {
            vi.mocked(isProxyConfigured).mockReturnValue(false);

            const result = buildProxiedImageUrl('https://example.com/img.png');
            expect(result).toBe('https://example.com/img.png');
        });

        it('encodes URLs with unicode characters', () => {
            const result = buildProxiedImageUrl(
                'https://example.com/画像.png',
            );
            expect(result).toContain('proxyImage?url=');
            expect(result).not.toBe('');
        });

        it('returns empty for javascript: scheme URLs (XSS prevention)', () => {
            expect(buildProxiedImageUrl('javascript:alert(1)')).toBe('');
        });

        it('returns empty for data: scheme URLs', () => {
            expect(buildProxiedImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
        });

        it('returns raw URL in dev mode', () => {
            vi.stubEnv('DEV', true);
            const result = buildProxiedImageUrl('https://example.com/img.png');
            expect(result).toBe('https://example.com/img.png');
        });
    });
});
