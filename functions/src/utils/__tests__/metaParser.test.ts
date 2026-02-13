/**
 * Meta Parser Tests
 * TDD: Validates OG/Twitter Card parsing, favicon resolution, edge cases
 */
import { describe, it, expect } from 'vitest';
import { parseMetaTags, extractDomain } from '../metaParser.js';

describe('metaParser', () => {
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

        it('ignores invalid twitter:card values', () => {
            const html = `
                <html><head>
                    <meta name="twitter:card" content="invalid_type" />
                </head><body></body></html>
            `;
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.cardType).toBeUndefined();
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

        it('handles HTML with no head section', () => {
            const html = '<html><body><p>No head</p></body></html>';
            const result = parseMetaTags(html, 'https://example.com');
            expect(result.url).toBe('https://example.com');
            expect(result.title).toBeUndefined();
        });
    });
});
