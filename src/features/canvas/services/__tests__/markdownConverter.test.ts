/** markdownConverter Tests - Validates markdown <-> HTML conversion */
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

describe('markdownToHtml AI output patterns', () => {
    it('converts loose ordered list with all 1. markers to single ol', () => {
        const md = '1. First item\n\n1. Second item\n\n1. Third item';
        const html = markdownToHtml(md);
        expect(html).toContain('<li><p>First item</p></li>');
        expect(html).toContain('<li><p>Second item</p></li>');
        expect(html).toContain('<li><p>Third item</p></li>');
        // Should be a single <ol>, not three
        expect((html.match(/<ol/g) ?? []).length).toBe(1);
    });

    it('continues ordered list numbering across bullet interruptions', () => {
        const md = '1. First\n\n* Sub A\n* Sub B\n\n1. Second';
        const html = markdownToHtml(md);
        // Second <ol> should continue from item 2
        expect(html).toContain('start="2"');
    });

    it('renders bold and italic inside list items', () => {
        const md = '1. **Bold item:** description\n2. *Italic item:* details';
        const html = markdownToHtml(md);
        expect(html).toContain('<strong>Bold item:</strong>');
        expect(html).toContain('<em>Italic item:</em>');
    });

    it('wraps tight list items in p tags for TipTap', () => {
        const md = '- Alpha\n- Beta\n- Gamma';
        const html = markdownToHtml(md);
        expect(html).toContain('<li><p>Alpha</p></li>');
        expect(html).toContain('<li><p>Beta</p></li>');
        expect(html).toContain('<li><p>Gamma</p></li>');
    });

    it('handles real AI output with mixed numbered and bullet items', () => {
        const md = [
            '1. **Hook:** Start with scenario',
            '',
            '1. **Psychology:** Introduce trade-off',
            '',
            '1. **Frameworks:**',
            '',
            '* **Western:** Touch upon theory',
            '* **Indian:** Link this concept',
            '',
            '1. **Insights:**',
            '* **Embrace:** Encourage parents',
        ].join('\n');
        const html = markdownToHtml(md);
        // Bold rendered correctly
        expect(html).toContain('<strong>Hook:</strong>');
        expect(html).toContain('<strong>Frameworks:</strong>');
        expect(html).toContain('<strong>Western:</strong>');
        // Fourth numbered item continues from 4
        expect(html).toContain('start="4"');
        // No raw markdown markers
        expect(html).not.toMatch(/\*\*[A-Z]/);
        expect(html).not.toMatch(/^\d+\. /m);
    });

    it('handles nested lists without wrapping sub-list in p', () => {
        const md = '1. Parent\n   - Child A\n   - Child B';
        const html = markdownToHtml(md);
        // Nested <ul> must NOT be inside <p> — that's invalid HTML
        expect(html).not.toMatch(/<p>[^<]*<ul>/);
        // Parent text wrapped in <p>, nested list is a sibling
        expect(html).toContain('<li><p>Parent</p>');
        expect(html).toContain('<li><p>Child A</p></li>');
        expect(html).toContain('<li><p>Child B</p></li>');
    });

    it('resets ordered list numbering after headings', () => {
        const md = '1. First\n\n## New Section\n\n1. Restart';
        const html = markdownToHtml(md);
        // Second <ol> should NOT have start attribute (reset at heading)
        const secondOl = html.split('</h2>')[1] ?? '';
        expect(secondOl).not.toContain('start=');
    });

    it('resets ordered list numbering after horizontal rule', () => {
        const md = '1. First\n\n---\n\n1. Restart';
        const html = markdownToHtml(md);
        const afterHr = html.split('</hr>')[1] ?? html.split('<hr>')[1] ?? html.split('<hr')[1] ?? '';
        expect(afterHr).not.toContain('start=');
    });

    it('handles empty list items', () => {
        const md = '- \n- Item';
        const html = markdownToHtml(md);
        expect(html).toContain('<ul>');
        expect(html).toContain('<li><p>Item</p></li>');
    });

    it('renders nested ordered lists correctly', () => {
        const md = '1. Top\n   1. Nested A\n   2. Nested B';
        const html = markdownToHtml(md);
        expect(html).toContain('<li><p>Top</p>');
        expect(html).toContain('<li><p>Nested A</p></li>');
        expect(html).toContain('<li><p>Nested B</p></li>');
        // Nested <ol> should NOT be inside <p>
        expect(html).not.toMatch(/<p>[^<]*<ol>/);
    });
});

describe('htmlToMarkdown start attribute', () => {
    it('falls back to 1 when start attribute is invalid', () => {
        const html = '<ol start="abc"><li><p>First</p></li><li><p>Second</p></li></ol>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('1. First');
        expect(md).toContain('2. Second');
    });

    it('respects start attribute on ordered lists', () => {
        const html = '<ol start="3"><li><p>Third</p></li><li><p>Fourth</p></li></ol>';
        const md = htmlToMarkdown(html);
        expect(md).toContain('3. Third');
        expect(md).toContain('4. Fourth');
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

    it('preserves loose ordered list numbering through round-trip', () => {
        const md = '1. First\n\n1. Second\n\n1. Third';
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain('1. First');
        expect(result).toContain('2. Second');
        expect(result).toContain('3. Third');
    });
});
