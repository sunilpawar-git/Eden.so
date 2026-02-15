/**
 * Sanitizer Tests — DOMParser-based XSS prevention
 */
import { describe, it, expect } from 'vitest';
import { sanitizeContent } from '../utils/sanitizer';

describe('sanitizeContent', () => {
    it('strips HTML tags', () => {
        expect(sanitizeContent('<b>bold</b>')).toBe('bold');
    });

    it('strips script tags with content', () => {
        expect(sanitizeContent('<script>alert("xss")</script>hello')).toBe('hello');
    });

    it('strips javascript: protocol', () => {
        expect(sanitizeContent('javascript:alert(1)')).toBe('alert(1)');
    });

    it('strips event handlers in img tags', () => {
        const result = sanitizeContent('<img onerror="alert(1)" src="x" />');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('alert');
    });

    it('handles nested/obfuscated script tags', () => {
        const result = sanitizeContent('<scr<script>ipt>alert(1)</script>');
        expect(result).not.toContain('<script');
        // DOMParser strips actual HTML elements; remaining text is safe (no executable code)
        expect(result).not.toContain('</script>');
    });

    it('strips style-based XSS', () => {
        const result = sanitizeContent('<div style="background:url(javascript:alert(1))">text</div>');
        expect(result).toBe('text');
    });

    it('preserves plain text', () => {
        expect(sanitizeContent('Hello World')).toBe('Hello World');
    });

    it('preserves markdown formatting', () => {
        expect(sanitizeContent('# Heading\n- list item')).toBe('# Heading\n- list item');
    });

    it('strips vbscript: protocol', () => {
        expect(sanitizeContent('vbscript:MsgBox("xss")')).toBe('MsgBox("xss")');
    });

    it('strips vbscript: protocol case-insensitively', () => {
        expect(sanitizeContent('VbScript:alert')).toBe('alert');
    });

    it('strips data:text/html protocol', () => {
        const result = sanitizeContent('data:text/html:<h1>evil</h1>');
        expect(result).not.toContain('data:text/html');
    });

    it('strips data:text/html with spaces in protocol', () => {
        const result = sanitizeContent('data :text/html:payload');
        expect(result).not.toContain('data');
    });
});
