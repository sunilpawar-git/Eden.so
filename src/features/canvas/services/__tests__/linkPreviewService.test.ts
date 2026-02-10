/**
 * Link Preview Service Tests
 * TDD: Validates URL fetching, OG/Twitter meta tag parsing, error handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLinkPreview, parseMetaTags, extractDomain } from '../linkPreviewService';

describe('linkPreviewService', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    describe('extractDomain', () => {
        it('extracts domain from https URL', () => {
            expect(extractDomain('https://example.com/path')).toBe('example.com');
        });

        it('extracts domain from http URL', () => {
            expect(extractDomain('http://blog.example.com')).toBe('blog.example.com');
        });

        it('returns empty string for invalid URL', () => {
            expect(extractDomain('not-a-url')).toBe('');
        });
    });

    describe('parseMetaTags', () => {
        it('parses Open Graph title and description', () => {
            const html = `
                <html><head>
                    <meta property="og:title" content="My Page" />
                    <meta property="og:description" content="A description" />
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.title).toBe('My Page');
            expect(result.description).toBe('A description');
        });

        it('parses Open Graph image', () => {
            const html = `
                <html><head>
                    <meta property="og:image" content="https://example.com/og.png" />
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.image).toBe('https://example.com/og.png');
        });

        it('prefers og:title over twitter:title', () => {
            const html = `
                <html><head>
                    <meta property="og:title" content="OG Title" />
                    <meta name="twitter:title" content="Twitter Title" />
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.title).toBe('OG Title');
        });

        it('falls back to twitter:title when og:title is missing', () => {
            const html = `
                <html><head>
                    <meta name="twitter:title" content="Twitter Title" />
                    <meta name="twitter:description" content="Tweet desc" />
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.title).toBe('Twitter Title');
            expect(result.description).toBe('Tweet desc');
        });

        it('parses twitter:card type', () => {
            const html = `
                <html><head>
                    <meta name="twitter:card" content="summary_large_image" />
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.cardType).toBe('summary_large_image');
        });

        it('falls back to <title> tag when no OG/Twitter title', () => {
            const html = `
                <html><head>
                    <title>Fallback Title</title>
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.title).toBe('Fallback Title');
        });

        it('parses favicon from link[rel="icon"]', () => {
            const html = `
                <html><head>
                    <link rel="icon" href="/favicon.ico" />
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.favicon).toBe('https://example.com/favicon.ico');
        });

        it('resolves relative favicon URLs', () => {
            const html = `
                <html><head>
                    <link rel="icon" href="/assets/icon.png" />
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://cdn.example.com/page');
            expect(result.favicon).toBe('https://cdn.example.com/assets/icon.png');
        });

        it('defaults favicon to /favicon.ico when no link tag', () => {
            const html = '<html><head></head><body></body></html>';
            const result = parseMetaTags(html, 'https://example.com/page');
            expect(result.favicon).toBe('https://example.com/favicon.ico');
        });

        it('sets domain from URL', () => {
            const html = '<html><head></head><body></body></html>';
            const result = parseMetaTags(html, 'https://blog.example.com/post/1');
            expect(result.domain).toBe('blog.example.com');
        });

        it('returns minimal metadata for empty HTML', () => {
            const result = parseMetaTags('', 'https://example.com');
            expect(result.url).toBe('https://example.com');
            expect(result.domain).toBe('example.com');
            expect(result.fetchedAt).toBeGreaterThan(0);
        });
    });

    describe('fetchLinkPreview', () => {
        it('fetches and parses a URL into LinkPreviewMetadata', async () => {
            const html = `
                <html><head>
                    <meta property="og:title" content="Example" />
                    <meta property="og:description" content="Example site" />
                    <meta property="og:image" content="https://example.com/img.png" />
                </head><body></body></html>
            `;
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true, text: () => Promise.resolve(html),
            }));

            const result = await fetchLinkPreview('https://example.com');
            expect(result.title).toBe('Example');
            expect(result.description).toBe('Example site');
            expect(result.image).toBe('https://example.com/img.png');
            expect(result.error).toBeUndefined();
        });

        it('returns error metadata on fetch failure', async () => {
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

            const result = await fetchLinkPreview('https://fail.com');
            expect(result.url).toBe('https://fail.com');
            expect(result.domain).toBe('fail.com');
            expect(result.error).toBe(true);
        });

        it('returns error metadata on non-ok response', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: false, status: 404, text: () => Promise.resolve(''),
            }));

            const result = await fetchLinkPreview('https://missing.com/page');
            expect(result.error).toBe(true);
            expect(result.domain).toBe('missing.com');
        });

        it('passes AbortSignal to fetch', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true, text: () => Promise.resolve('<html></html>'),
            });
            vi.stubGlobal('fetch', fetchMock);
            const controller = new AbortController();

            await fetchLinkPreview('https://example.com', controller.signal);

            expect(fetchMock).toHaveBeenCalledWith(
                'https://example.com',
                expect.objectContaining({ signal: controller.signal }),
            );
        });
    });
});
