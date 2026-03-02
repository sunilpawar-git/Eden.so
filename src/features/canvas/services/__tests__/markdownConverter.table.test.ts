/**
 * markdownConverter Table Integration Tests
 * Exercises the full AI-output scenario (tables mixed with prose, lists, headings)
 * as seen in the ESRM comparison screenshot that triggered this feature.
 */
import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from '../markdownConverter';

describe('table integration — AI output patterns', () => {
    it('renders ESRM-style comparison table correctly', () => {
        const md = [
            '## How ESRM Differs from Traditional Risk Management',
            '',
            '| Traditional Risk Management | ESRM |',
            '| --- | --- |',
            '| Built around security programs with sub-programs. | Addresses all security risks. |',
            '| Addresses specific threats via a program. | Develops specific mitigation steps. |',
        ].join('\n');

        const html = markdownToHtml(md);
        expect(html).toContain('<h2>');
        expect(html).toContain('<table>');
        expect(html).toContain('<thead>');
        expect(html).toContain('<tbody>');
        expect(html).toContain('Traditional Risk Management');
        expect(html).toContain('ESRM');
        expect(html).toContain('Built around security programs');
    });

    it('round-trips ESRM-style table without data loss', () => {
        const md = [
            '| Traditional Risk Management | ESRM |',
            '| --- | --- |',
            '| Built around sub-programs. | Addresses all security risks. |',
        ].join('\n');

        const result = htmlToMarkdown(markdownToHtml(md));
        expect(result).toContain('Traditional Risk Management');
        expect(result).toContain('ESRM');
        expect(result).toContain('Built around sub-programs.');
        expect(result).toContain('Addresses all security risks.');
        expect(result).toContain('| --- |');
    });

    it('renders table followed by bullet list (mixed AI output)', () => {
        const md = [
            '| Feature | Value |',
            '| --- | --- |',
            '| Speed | Fast |',
            '',
            '**Benefits:**',
            '',
            '- Item A',
            '- Item B',
        ].join('\n');

        const html = markdownToHtml(md);
        expect(html).toContain('<table>');
        expect(html).toContain('<ul>');
        expect(html).toContain('Item A');
        expect(html).toContain('Speed');
    });

    it('renders table preceded by numbered list and heading', () => {
        const md = [
            '## Benefits of ESRM',
            '',
            '1. Informed Decisions',
            '1. Stakeholder Understanding',
            '',
            '| Stage | Description |',
            '| --- | --- |',
            '| Context | Understanding ESRM |',
        ].join('\n');

        const html = markdownToHtml(md);
        expect(html).toContain('<h2>');
        expect(html).toContain('<ol>');
        expect(html).toContain('<table>');
        expect(html).toContain('Context');
    });

    it('escapes pipe characters in cell content on round-trip', () => {
        const html = [
            '<table>',
            '<thead><tr><th>Rule</th></tr></thead>',
            '<tbody><tr><td>a | b</td></tr></tbody>',
            '</table>',
        ].join('');
        const md = htmlToMarkdown(html);
        // Pipe must be escaped to avoid corrupting the table structure
        expect(md).toContain('a \\| b');
        // Round-trip the escaped markdown back — should still produce table HTML
        const roundHtml = markdownToHtml(md);
        expect(roundHtml).toContain('<table>');
    });

    it('handles table with many columns (3+) correctly', () => {
        const md = [
            '| A | B | C | D |',
            '| --- | --- | --- | --- |',
            '| 1 | 2 | 3 | 4 |',
        ].join('\n');

        const html = markdownToHtml(md);
        expect(html).toContain('<table>');
        expect(html).toContain('A');
        expect(html).toContain('D');
        expect(html).toContain('1');
        expect(html).toContain('4');

        const result = htmlToMarkdown(html);
        expect(result).toContain('| A | B | C | D |');
        expect(result).toContain('| 1 | 2 | 3 | 4 |');
    });
});

describe('table integration — rehypeCompact whitespace handling', () => {
    it('markdownToHtml table contains no stray whitespace text nodes in output', () => {
        const md = '| X | Y |\n| --- | --- |\n| a | b |';
        const html = markdownToHtml(md);
        // Stray whitespace between tags would appear as "  " between table/thead etc.
        // Verify the output is compact — no whitespace-only runs between structural tags
        expect(html).not.toMatch(/<\/tr>\s+<tr>/);
        expect(html).not.toMatch(/<thead>\s+<tr>/);
    });
});
