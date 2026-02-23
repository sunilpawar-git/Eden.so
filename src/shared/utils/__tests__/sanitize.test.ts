/**
 * Sanitize Utility Tests — SSOT for filename sanitization
 */
import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../sanitize';

describe('sanitizeFilename', () => {
    it('passes through a normal filename', () => {
        expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
    });

    it('strips forward slashes', () => {
        expect(sanitizeFilename('../../etc/passwd')).toBe('____etc_passwd');
    });

    it('strips backslashes', () => {
        expect(sanitizeFilename('..\\..\\secret.txt')).toBe('____secret.txt');
    });

    it('strips double-dot traversal', () => {
        expect(sanitizeFilename('../attack.pdf')).toBe('__attack.pdf');
    });

    it('strips control characters', () => {
        expect(sanitizeFilename('file\x00name.txt')).toBe('filename.txt');
    });

    it('returns "unnamed" for empty input', () => {
        expect(sanitizeFilename('')).toBe('unnamed');
    });

    it('handles filename with spaces', () => {
        expect(sanitizeFilename('my document.pdf')).toBe('my document.pdf');
    });

    it('strips mixed traversal patterns', () => {
        const result = sanitizeFilename('a/../b/..\\c');
        expect(result).not.toContain('..');
        expect(result).not.toContain('/');
        expect(result).not.toContain('\\');
    });
});
