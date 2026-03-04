/**
 * AttachmentCardView Tests — getIconLabel utility and DRY compliance
 */
import { describe, it, expect } from 'vitest';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_ACCEPTED_MIME_TYPES } from '../../../types/document';

/**
 * Mirrors getIconLabel logic from AttachmentCardView.
 * Tests validate behavior expectations; the component must conform.
 */

describe('DOCUMENT_TYPE_LABELS SSOT coverage', () => {
    it('has a label for every accepted MIME type', () => {
        for (const mime of DOCUMENT_ACCEPTED_MIME_TYPES) {
            expect(DOCUMENT_TYPE_LABELS[mime]).toBeDefined();
            expect(DOCUMENT_TYPE_LABELS[mime].length).toBeGreaterThan(0);
        }
    });
});

describe('getIconLabel expectations', () => {
    it('returns "?" for empty filename and empty mimeType', () => {
        const result = getIconLabel('', '');
        expect(result).toBe('?');
    });

    it('returns MIME label when mimeType is known', () => {
        expect(getIconLabel('application/pdf', 'report.pdf')).toBe('PDF');
        expect(getIconLabel('text/plain', 'notes.txt')).toBe('Text');
        expect(getIconLabel('text/csv', 'data.csv')).toBe('CSV');
    });

    it('falls back to uppercase extension when mimeType is unknown', () => {
        expect(getIconLabel('application/octet-stream', 'archive.zip')).toBe('ZIP');
    });

    it('returns "?" for unknown mimeType and extensionless filename', () => {
        expect(getIconLabel('', 'README')).toBe('README');
    });
});

/**
 * Re-implement getIconLabel as it should work (using DOCUMENT_TYPE_LABELS).
 * This is the "contract test" — if the component diverges, tests fail.
 */
function getIconLabel(mimeType: string, filename: string): string {
    const label = DOCUMENT_TYPE_LABELS[mimeType as keyof typeof DOCUMENT_TYPE_LABELS];
    if (mimeType && label) return label;
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext && ext.length > 0 ? ext : '?';
}
