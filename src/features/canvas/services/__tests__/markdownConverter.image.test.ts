/**
 * Markdown Converter Image Tests — img tag round-trip and security
 */
import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from '../markdownConverter';

describe('markdownToHtml — images', () => {
    it('converts markdown image to <img> tag', () => {
        const html = markdownToHtml('![photo](https://cdn.example.com/a.jpg)');
        expect(html).toContain('<img');
        expect(html).toContain('src="https://cdn.example.com/a.jpg"');
        expect(html).toContain('alt="photo"');
    });

    it('handles image without alt text', () => {
        const html = markdownToHtml('![](https://cdn.example.com/b.png)');
        expect(html).toContain('<img');
        expect(html).toContain('src="https://cdn.example.com/b.png"');
        expect(html).toContain('alt=""');
    });

    it('renders image between paragraphs', () => {
        const md = 'Before text\n\n![pic](https://x.com/img.jpg)\n\nAfter text';
        const html = markdownToHtml(md);
        expect(html).toContain('<p>Before text</p>');
        expect(html).toContain('<img');
        expect(html).toContain('<p>After text</p>');
    });
});

describe('htmlToMarkdown — images', () => {
    it('converts <img> tag to markdown image', () => {
        const md = htmlToMarkdown('<img src="https://cdn.example.com/a.jpg" alt="photo">');
        expect(md).toBe('![photo](https://cdn.example.com/a.jpg)');
    });

    it('handles missing alt attribute', () => {
        const md = htmlToMarkdown('<img src="https://cdn.example.com/b.png">');
        expect(md).toBe('![](https://cdn.example.com/b.png)');
    });

    it('returns empty for img with no src', () => {
        const md = htmlToMarkdown('<img alt="broken">');
        expect(md).toBe('');
    });

    it('handles img inside paragraph context', () => {
        const html = '<p>Text before</p><img src="https://x.com/i.jpg" alt="pic"><p>Text after</p>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('Text before');
        expect(md).toContain('![pic](https://x.com/i.jpg)');
        expect(md).toContain('Text after');
    });
});

describe('image round-trip', () => {
    it('preserves image through markdown -> html -> markdown', () => {
        const original = '![photo](https://cdn.example.com/a.jpg)';
        const result = htmlToMarkdown(markdownToHtml(original));
        expect(result).toBe(original);
    });

    it('preserves image without alt text through round-trip', () => {
        const original = '![](https://cdn.example.com/b.png)';
        const result = htmlToMarkdown(markdownToHtml(original));
        expect(result).toBe(original);
    });

    it('preserves mixed text and images through round-trip', () => {
        const original = 'Hello world\n\n![pic](https://x.com/img.jpg)\n\nMore text';
        const result = htmlToMarkdown(markdownToHtml(original));
        expect(result).toBe(original);
    });
});
