/**
 * storagePathFromDownloadUrl — Unit tests for Firebase download URL to Storage path extraction.
 * SSOT: storagePathUtils.ts is the single source for this conversion.
 */
import { describe, it, expect } from 'vitest';
import { storagePathFromDownloadUrl } from '../storagePathUtils';

describe('storagePathFromDownloadUrl', () => {
    it('extracts path from a standard Firebase download URL', () => {
        const url =
            'https://firebasestorage.googleapis.com/v0/b/proj.appspot.com/o/users%2Fu1%2Ffile.txt?alt=media&token=abc';
        expect(storagePathFromDownloadUrl(url)).toBe('users/u1/file.txt');
    });

    it('decodes percent-encoded characters (%2F, %20) correctly', () => {
        const url =
            'https://firebasestorage.googleapis.com/v0/b/proj.appspot.com/o/users%2Fu1%2Fmy%20doc.pdf?alt=media';
        expect(storagePathFromDownloadUrl(url)).toBe('users/u1/my doc.pdf');
    });

    it('returns null when URL has no /o/ segment', () => {
        const url = 'https://firebasestorage.googleapis.com/v0/b/proj.appspot.com/other/path';
        expect(storagePathFromDownloadUrl(url)).toBeNull();
    });

    it('returns null for malformed / non-URL strings (no throw)', () => {
        expect(storagePathFromDownloadUrl('not-a-url')).toBeNull();
        expect(storagePathFromDownloadUrl('')).toBeNull();
        expect(storagePathFromDownloadUrl('://broken')).toBeNull();
    });

    it('extracts path when URL has no query string', () => {
        const url =
            'https://firebasestorage.googleapis.com/v0/b/proj.appspot.com/o/users%2Fu1%2Ffile.txt';
        expect(storagePathFromDownloadUrl(url)).toBe('users/u1/file.txt');
    });
});
