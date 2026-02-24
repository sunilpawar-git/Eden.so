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

    it('produces bare <img> without <p> wrapper for standalone images', () => {
        const html = markdownToHtml('![photo](https://cdn.example.com/a.jpg)');
        expect(html).not.toMatch(/<p><img/);
        expect(html).toContain('<img');
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

describe('htmlToMarkdown — image width preservation', () => {
    it('emits raw <img> HTML when width attribute is set', () => {
        const md = htmlToMarkdown('<img src="https://cdn.example.com/a.jpg" alt="photo" width="300">');
        expect(md).toBe('<img src="https://cdn.example.com/a.jpg" alt="photo" width="300">');
    });

    it('emits standard markdown when no width attribute', () => {
        const md = htmlToMarkdown('<img src="https://cdn.example.com/a.jpg" alt="photo">');
        expect(md).toBe('![photo](https://cdn.example.com/a.jpg)');
    });

    it('falls back to standard markdown for non-numeric width', () => {
        const md = htmlToMarkdown('<img src="https://cdn.example.com/a.jpg" alt="photo" width="300px">');
        expect(md).toBe('![photo](https://cdn.example.com/a.jpg)');
    });

    it('returns empty string for unsafe src', () => {
        const md = htmlToMarkdown('<img src="javascript:alert(1)" alt="xss">');
        expect(md).toBe('');
    });

    it('returns empty string for data:text/html src', () => {
        const md = htmlToMarkdown('<img src="data:text/html,<script>alert(1)</script>" alt="xss">');
        expect(md).toBe('');
    });

    it('escapes double quotes in alt to prevent attribute injection', () => {
        const md = htmlToMarkdown('<img src="https://cdn.example.com/a.jpg" alt=\'x&quot; onload=&quot;alert(1)\' width="300">');
        expect(md).toContain('&quot;');
        expect(md).not.toMatch(/alt="[^"]*" onload="/);
    });

    it('escapes angle brackets in alt to prevent tag injection', () => {
        const md = htmlToMarkdown('<img src="https://cdn.example.com/a.jpg" alt="<script>" width="300">');
        expect(md).not.toContain('<script>');
        expect(md).toContain('&lt;');
    });

    it('escapes ampersand in alt to prevent entity injection', () => {
        const md = htmlToMarkdown('<img src="https://cdn.example.com/a.jpg" alt="A&B" width="300">');
        expect(md).toContain('&amp;');
    });
});

describe('image width round-trip', () => {
    it('preserves width through htmlToMarkdown -> markdownToHtml', () => {
        const html = '<img src="https://cdn.example.com/a.jpg" alt="photo" width="300">';
        const md = htmlToMarkdown(html);
        const roundTripped = markdownToHtml(md);
        expect(roundTripped).toContain('src="https://cdn.example.com/a.jpg"');
        expect(roundTripped).toContain('width="300"');
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
