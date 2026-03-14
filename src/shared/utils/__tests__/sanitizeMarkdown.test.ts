/**
 * Phase B — MindmapRenderer XSS sanitization tests.
 *
 * Validates that sanitizeMarkdown strips dangerous payloads before
 * they reach markmap-lib's Transformer, which converts markdown to
 * HTML-bearing tree nodes rendered via innerHTML.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeMarkdown } from '@/shared/utils/sanitize';

describe('sanitizeMarkdown', () => {
    it('passes through clean markdown unchanged', () => {
        const md = '# Topic\n- Branch A\n- Branch B';
        expect(sanitizeMarkdown(md)).toBe(md);
    });

    it('strips <script> tags', () => {
        const md = '# Hello\n<script>alert("xss")</script>\n- Item';
        const result = sanitizeMarkdown(md);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('</script');
        expect(result).toContain('# Hello');
        expect(result).toContain('- Item');
    });

    it('strips inline event handlers (onerror, onclick, etc.)', () => {
        const md = '# Title\n<img onerror="alert(1)" src="x">\n- Item';
        const result = sanitizeMarkdown(md);
        expect(result).not.toContain('onerror');
    });

    it('strips javascript: protocol URIs', () => {
        const md = '# Title\n[click me](javascript:alert(1))\n- Item';
        const result = sanitizeMarkdown(md);
        expect(result).not.toContain('javascript:');
    });

    it('strips <iframe> tags', () => {
        const md = '# Title\n<iframe src="https://evil.com"></iframe>';
        const result = sanitizeMarkdown(md);
        expect(result).not.toContain('<iframe');
    });

    it('handles empty string', () => {
        expect(sanitizeMarkdown('')).toBe('');
    });

    it('handles string with only whitespace', () => {
        expect(sanitizeMarkdown('   ')).toBe('   ');
    });

    it('is case-insensitive for dangerous tags', () => {
        const md = '<SCRIPT>alert(1)</SCRIPT>';
        expect(sanitizeMarkdown(md)).not.toMatch(/<script/i);
    });

    it('strips data: URIs in markdown links', () => {
        const md = '[evil](data:text/html,<script>alert(1)</script>)';
        const result = sanitizeMarkdown(md);
        expect(result).not.toContain('data:text/html');
    });
});
