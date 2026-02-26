/** markdownConverter Tests - Round-trip (markdown ↔ HTML ↔ markdown) */
import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from '../markdownConverter';

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
        const md = '## Title\n\nBody with **bold** and *italic*\n\n- Item 1\n- Item 2\n\n> A quote';
        expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });

    it('preserves AI output with bold paragraphs and bullet lists', () => {
        const md = [
            '**1. Self-Assessment: Where Are You Now?**',
            '',
            '- **Quadrants:** Assess your current state',
            '- **Levels:** Identify your dominant level',
            '',
            '**2. Targeted Development:**',
            '',
            '- **Prioritize:** Developing your weakest quadrant',
            '- **Actionable Steps:** Choose one specific goal',
        ].join('\n');
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toBe(md);
    });

    it('preserves loose ordered list numbering through round-trip', () => {
        const md = '1. First\n\n1. Second\n\n1. Third';
        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain('1. First');
        expect(result).toContain('2. Second');
        expect(result).toContain('3. Third');
    });
});
