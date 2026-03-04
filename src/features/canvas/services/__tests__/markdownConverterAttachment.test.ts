/**
 * markdownConverter — attachment round-trip serialization tests
 * Validates that attachment nodes survive the HTML ↔ markdown round-trip
 */
import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, markdownToHtml, attachmentElementToMarkdown } from '../markdownConverter';

describe('attachmentElementToMarkdown', () => {
    it('serializes an attachment div to raw HTML with data-attachment', () => {
        const doc = new DOMParser().parseFromString(
            `<div data-attachment='{"url":"https://cdn.example.com/a.pdf","filename":"a.pdf","thumbnailUrl":null}'></div>`,
            'text/html',
        );
        const el = doc.querySelector('div[data-attachment]')!;
        const result = attachmentElementToMarkdown(el);

        expect(result).toContain('data-attachment');
        expect(result).toContain('a.pdf');
    });

    it('handles missing data-attachment gracefully (empty payload)', () => {
        const doc = new DOMParser().parseFromString('<div data-attachment></div>', 'text/html');
        const el = doc.querySelector('div[data-attachment]')!;
        const result = attachmentElementToMarkdown(el);
        expect(result).toContain('data-attachment');
    });
});

describe('htmlToMarkdown — attachment node round-trip', () => {
    it('preserves attachment div as raw HTML in markdown', () => {
        const payload = JSON.stringify({ url: 'https://cdn.example.com/doc.pdf', filename: 'doc.pdf', thumbnailUrl: null });
        const html = `<div data-attachment='${payload}'></div>`;
        const md = htmlToMarkdown(html);

        expect(md).toContain('data-attachment');
        expect(md).toContain('doc.pdf');
    });
});

describe('markdownToHtml — attachment node round-trip', () => {
    it('passes raw attachment HTML through the pipeline unchanged', () => {
        const payload = JSON.stringify({ url: 'https://cdn.example.com/doc.pdf', filename: 'doc.pdf', thumbnailUrl: null });
        const rawHtml = `<div data-attachment='${payload}'></div>`;
        const md = htmlToMarkdown(rawHtml);
        const backToHtml = markdownToHtml(md);

        expect(backToHtml).toContain('data-attachment');
    });
});
