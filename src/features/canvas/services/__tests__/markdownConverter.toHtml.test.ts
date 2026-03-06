/** markdownConverter — markdownToHtml conversion tests */
import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../markdownConverter';

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

describe('markdownToHtml tables (GFM)', () => {
    it('converts basic 2-column table to table HTML', () => {
        const md = '| A | B |\n|---|---|\n| 1 | 2 |';
        const html = markdownToHtml(md);
        expect(html).toContain('<table>');
        expect(html).toContain('<thead>');
        expect(html).toContain('<tbody>');
    });

    it('renders th cells in thead', () => {
        const md = '| Name | Age |\n|---|---|\n| Alice | 30 |';
        const html = markdownToHtml(md);
        expect(html).toContain('<th>');
        expect(html).toContain('Name');
        expect(html).toContain('Age');
    });

    it('renders td cells in tbody', () => {
        const md = '| Name | Age |\n|---|---|\n| Alice | 30 |';
        const html = markdownToHtml(md);
        expect(html).toContain('<td>');
        expect(html).toContain('Alice');
        expect(html).toContain('30');
    });

    it('handles empty cell values', () => {
        const md = '| A | B |\n|---|---|\n|   | 2 |';
        const html = markdownToHtml(md);
        expect(html).toContain('<table>');
        expect(html).toContain('<td>');
    });

    it('renders table mixed with heading above and paragraph below', () => {
        const md = '## Comparison\n\n| X | Y |\n|---|---|\n| a | b |\n\nSome text';
        const html = markdownToHtml(md);
        expect(html).toContain('<h2>Comparison</h2>');
        expect(html).toContain('<table>');
        expect(html).toContain('<p>Some text</p>');
    });

    it('handles single-column table', () => {
        const md = '| Item |\n|---|\n| Alpha |\n| Beta |';
        const html = markdownToHtml(md);
        expect(html).toContain('<table>');
        expect(html).toContain('Alpha');
        expect(html).toContain('Beta');
    });
});
