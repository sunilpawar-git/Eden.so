/**
 * AttachmentCardView Tests — getIconLabel utility, isSafeUrl, DRY compliance, StatusBadge
 */
import { describe, it, expect } from 'vitest';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_ACCEPTED_MIME_TYPES } from '../../../types/document';
import { strings } from '@/shared/localization/strings';
import { getIconLabel, isSafeUrl, effectiveMimeType } from '../AttachmentCardView.utils';

describe('DOCUMENT_TYPE_LABELS SSOT coverage', () => {
    it('has a label for every accepted MIME type', () => {
        for (const mime of DOCUMENT_ACCEPTED_MIME_TYPES) {
            expect(DOCUMENT_TYPE_LABELS[mime]).toBeDefined();
            expect(DOCUMENT_TYPE_LABELS[mime].length).toBeGreaterThan(0);
        }
    });
});

describe('getIconLabel', () => {
    it('returns "?" for empty filename and empty mimeType', () => {
        expect(getIconLabel('', '')).toBe('?');
    });

    it('returns MIME label when mimeType is known', () => {
        expect(getIconLabel('application/pdf', 'report.pdf')).toBe('PDF');
        expect(getIconLabel('text/plain', 'notes.txt')).toBe('Text');
        expect(getIconLabel('text/csv', 'data.csv')).toBe('CSV');
    });

    it('falls back to uppercase extension when mimeType is unknown', () => {
        expect(getIconLabel('application/octet-stream', 'archive.zip')).toBe('ZIP');
    });

    it('returns uppercased filename when no extension and unknown mimeType', () => {
        expect(getIconLabel('', 'README')).toBe('README');
    });
});

describe('isSafeUrl', () => {
    it('allows https URLs', () => {
        expect(isSafeUrl('https://cdn.example.com/doc.pdf')).toBe(true);
    });

    it('allows http URLs', () => {
        expect(isSafeUrl('http://localhost:3000/file.txt')).toBe(true);
    });

    it('rejects javascript: URIs', () => {
        expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: URIs', () => {
        expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('rejects empty strings', () => {
        expect(isSafeUrl('')).toBe(false);
    });

    it('rejects blob: URIs', () => {
        expect(isSafeUrl('blob:https://example.com/uuid')).toBe(false);
    });
});

describe('effectiveMimeType', () => {
    it('returns the mimeType unchanged when provided', () => {
        expect(effectiveMimeType('application/pdf', 'doc.pdf')).toBe('application/pdf');
        expect(effectiveMimeType('image/png', 'photo.png')).toBe('image/png');
    });

    it('infers application/pdf from .pdf extension when mimeType is empty', () => {
        expect(effectiveMimeType('', 'report.pdf')).toBe('application/pdf');
        expect(effectiveMimeType('', 'What Is Identity PDF.pdf')).toBe('application/pdf');
    });

    it('infers image/png from .png extension when mimeType is empty', () => {
        expect(effectiveMimeType('', 'photo.png')).toBe('image/png');
    });

    it('infers image/jpeg from .jpg extension when mimeType is empty', () => {
        expect(effectiveMimeType('', 'selfie.jpg')).toBe('image/jpg');
    });

    it('returns empty string for unknown extension when mimeType is empty', () => {
        expect(effectiveMimeType('', 'archive.zip')).toBe('');
        expect(effectiveMimeType('', 'readme')).toBe('');
    });
});

describe('StatusBadge upload state contract', () => {
    it('uses docUploading string for uploading status', () => {
        expect(strings.canvas.docUploading).toBeDefined();
        expect(typeof strings.canvas.docUploading).toBe('string');
    });

    it('has a spinner CSS class name available in the module', async () => {
        const css = await import('../AttachmentCardView.module.css');
        expect(css.default.spinner).toBeDefined();
    });

    it('has statusUploading CSS class name available in the module', async () => {
        const css = await import('../AttachmentCardView.module.css');
        expect(css.default.statusUploading).toBeDefined();
    });
});
