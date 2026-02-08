/**
 * markdownConverter Tests - Validates markdown <-> HTML conversion
 * TDD: RED phase - these tests define the contract before implementation
 */
import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from '../markdownConverter';

describe('markdownToHtml', () => {
    it('converts plain text to paragraph', () => {
        expect(markdownToHtml('Hello world')).toBe('<p>Hello world</p>');
    });

    it('converts bold text', () => {
        expect(markdownToHtml('**bold**')).toBe('<p><strong>bold</strong></p>');
    });

    it('converts italic text', () => {
        expect(markdownToHtml('*italic*')).toBe('<p><em>italic</em></p>');
    });

    it('converts headings', () => {
        expect(markdownToHtml('# Heading 1')).toBe('<h1>Heading 1</h1>');
        expect(markdownToHtml('## Heading 2')).toBe('<h2>Heading 2</h2>');
        expect(markdownToHtml('### Heading 3')).toBe('<h3>Heading 3</h3>');
    });

    it('converts unordered lists', () => {
        const md = '- Item 1\n- Item 2';
        const html = markdownToHtml(md);
        expect(html).toContain('<ul>');
        expect(html).toContain('<li><p>Item 1</p></li>');
        expect(html).toContain('<li><p>Item 2</p></li>');
    });

    it('converts ordered lists', () => {
        const md = '1. First\n2. Second';
        const html = markdownToHtml(md);
        expect(html).toContain('<ol>');
        expect(html).toContain('<li><p>First</p></li>');
        expect(html).toContain('<li><p>Second</p></li>');
    });

    it('converts inline code', () => {
        expect(markdownToHtml('Use `code` here')).toBe('<p>Use <code>code</code> here</p>');
    });

    it('converts code blocks', () => {
        const md = '```\nconst x = 1;\n```';
        const html = markdownToHtml(md);
        expect(html).toContain('<pre><code>const x = 1;\n</code></pre>');
    });

    it('converts blockquotes', () => {
        expect(markdownToHtml('> Quote text')).toBe('<blockquote><p>Quote text</p></blockquote>');
    });

    it('handles empty string', () => {
        expect(markdownToHtml('')).toBe('');
    });

    it('converts multiple paragraphs', () => {
        const md = 'First paragraph\n\nSecond paragraph';
        const html = markdownToHtml(md);
        expect(html).toContain('<p>First paragraph</p>');
        expect(html).toContain('<p>Second paragraph</p>');
    });
});

describe('htmlToMarkdown', () => {
    it('converts paragraph to plain text', () => {
        expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world');
    });

    it('converts bold', () => {
        expect(htmlToMarkdown('<p><strong>bold</strong></p>')).toBe('**bold**');
    });

    it('converts italic', () => {
        expect(htmlToMarkdown('<p><em>italic</em></p>')).toBe('*italic*');
    });

    it('converts headings', () => {
        expect(htmlToMarkdown('<h1>Heading 1</h1>')).toBe('# Heading 1');
        expect(htmlToMarkdown('<h2>Heading 2</h2>')).toBe('## Heading 2');
        expect(htmlToMarkdown('<h3>Heading 3</h3>')).toBe('### Heading 3');
    });

    it('converts unordered lists', () => {
        const html = '<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('- Item 1');
        expect(md).toContain('- Item 2');
    });

    it('converts ordered lists', () => {
        const html = '<ol><li><p>First</p></li><li><p>Second</p></li></ol>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('1. First');
        expect(md).toContain('2. Second');
    });

    it('converts inline code', () => {
        expect(htmlToMarkdown('<p>Use <code>code</code> here</p>')).toBe('Use `code` here');
    });

    it('converts code blocks', () => {
        const html = '<pre><code>const x = 1;\n</code></pre>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('```');
        expect(md).toContain('const x = 1;');
    });

    it('converts blockquotes', () => {
        expect(htmlToMarkdown('<blockquote><p>Quote text</p></blockquote>')).toBe('> Quote text');
    });

    it('handles empty string', () => {
        expect(htmlToMarkdown('')).toBe('');
    });
});

describe('htmlToMarkdown multi-block', () => {
    it('separates heading from paragraph with newline', () => {
        const html = '<h2>Title</h2><p>Body text</p>';
        expect(htmlToMarkdown(html)).toBe('## Title\nBody text');
    });

    it('separates multiple paragraphs with blank line', () => {
        const html = '<p>First</p><p>Second</p>';
        expect(htmlToMarkdown(html)).toBe('First\n\nSecond');
    });

    it('separates heading + paragraph + list + blockquote', () => {
        const html = '<h2>Notes</h2><p>Some text</p><ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul><blockquote><p>A quote</p></blockquote>';
        const md = htmlToMarkdown(html);
        expect(md).toBe('## Notes\nSome text\n- Item 1\n- Item 2\n> A quote');
    });

    it('separates heading from list', () => {
        const html = '<h1>Tasks</h1><ul><li><p>Do this</p></li><li><p>Do that</p></li></ul>';
        expect(htmlToMarkdown(html)).toBe('# Tasks\n- Do this\n- Do that');
    });
});

describe('round-trip', () => {
    it('preserves plain text', () => {
        const md = 'Hello world';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves bold text', () => {
        const md = '**bold text**';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves italic text', () => {
        const md = '*italic text*';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves headings', () => {
        expect(htmlToMarkdown(markdownToHtml('# Heading 1'))).toBe('# Heading 1');
        expect(htmlToMarkdown(markdownToHtml('## Heading 2'))).toBe('## Heading 2');
    });

    it('preserves blockquotes', () => {
        expect(htmlToMarkdown(markdownToHtml('> Quote text'))).toBe('> Quote text');
    });

    it('preserves multi-block document', () => {
        const md = '## Title\nBody with **bold** and *italic*\n- Item 1\n- Item 2\n> A quote';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });
});
