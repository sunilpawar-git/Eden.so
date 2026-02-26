/** markdownConverter AI Output Patterns — loose lists, nested lists, TipTap compatibility */
import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../markdownConverter';

describe('markdownToHtml AI output patterns', () => {
    it('converts loose ordered list with all 1. markers to single ol', () => {
        const md = '1. First item\n\n1. Second item\n\n1. Third item';
        const html = markdownToHtml(md);
        expect(html).toContain('<li><p>First item</p></li>');
        expect(html).toContain('<li><p>Second item</p></li>');
        expect(html).toContain('<li><p>Third item</p></li>');
        expect((html.match(/<ol/g) ?? []).length).toBe(1);
    });

    it('continues ordered list numbering across bullet interruptions', () => {
        const md = '1. First\n\n* Sub A\n* Sub B\n\n1. Second';
        const html = markdownToHtml(md);
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
        expect(html).toContain('<strong>Hook:</strong>');
        expect(html).toContain('<strong>Frameworks:</strong>');
        expect(html).toContain('<strong>Western:</strong>');
        expect(html).toContain('start="4"');
        expect(html).not.toMatch(/\*\*[A-Z]/);
        expect(html).not.toMatch(/^\d+\. /m);
    });

    it('handles nested lists without wrapping sub-list in p', () => {
        const md = '1. Parent\n   - Child A\n   - Child B';
        const html = markdownToHtml(md);
        expect(html).not.toMatch(/<p>[^<]*<ul>/);
        expect(html).toContain('<li><p>Parent</p>');
        expect(html).toContain('<li><p>Child A</p></li>');
        expect(html).toContain('<li><p>Child B</p></li>');
    });

    it('resets ordered list numbering after headings', () => {
        const md = '1. First\n\n## New Section\n\n1. Restart';
        const html = markdownToHtml(md);
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
        expect(html).not.toMatch(/<p>[^<]*<ol>/);
    });
});
