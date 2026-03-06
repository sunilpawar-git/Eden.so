/**
 * Document Types Tests — MIME validation, magic bytes, and AttachmentMeta
 */
import { describe, it, expect } from 'vitest';
import {
    DOCUMENT_ACCEPTED_MIME_TYPES,
    DOCUMENT_MAX_FILE_SIZE,
    MAGIC_BYTE_SIGNATURES,
    DOCUMENT_TYPE_LABELS,
    DOCUMENT_EXTENSIONS,
    isAcceptedDocumentType,
    readFileMagicBytes,
    validateMagicBytes,
} from '../../types/document';
import type { AttachmentMeta, DocumentMimeType } from '../../types/document';

/** Helper: create a File with specific bytes */
function makeFileWithBytes(name: string, bytes: number[], type: string): File {
    return new File([new Uint8Array(bytes)], name, { type });
}

describe('DOCUMENT_ACCEPTED_MIME_TYPES', () => {
    it('includes PDF, text/plain, text/csv, and text/markdown (MVP)', () => {
        expect(DOCUMENT_ACCEPTED_MIME_TYPES).toEqual([
            'application/pdf',
            'text/plain',
            'text/csv',
            'text/markdown',
        ]);
    });

    it('excludes DOCX and XLSX (deferred)', () => {
        const mimes = DOCUMENT_ACCEPTED_MIME_TYPES as readonly string[];
        expect(mimes).not.toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(mimes).not.toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
});

describe('DOCUMENT_MAX_FILE_SIZE', () => {
    it('is 15 MB', () => {
        expect(DOCUMENT_MAX_FILE_SIZE).toBe(15 * 1024 * 1024);
    });
});

describe('isAcceptedDocumentType', () => {
    it('returns true for allowed MIME types', () => {
        expect(isAcceptedDocumentType('application/pdf')).toBe(true);
        expect(isAcceptedDocumentType('text/plain')).toBe(true);
        expect(isAcceptedDocumentType('text/csv')).toBe(true);
        expect(isAcceptedDocumentType('text/markdown')).toBe(true);
    });

    it('returns false for disallowed MIME types', () => {
        expect(isAcceptedDocumentType('image/jpeg')).toBe(false);
        expect(isAcceptedDocumentType('text/html')).toBe(false);
        expect(isAcceptedDocumentType('application/javascript')).toBe(false);
        expect(isAcceptedDocumentType('application/octet-stream')).toBe(false);
    });
});

describe('MAGIC_BYTE_SIGNATURES', () => {
    it('has a PDF signature of %PDF (0x25504446)', () => {
        const pdfSig = MAGIC_BYTE_SIGNATURES.get('application/pdf');
        expect(pdfSig).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    });

    it('does not have signatures for text types', () => {
        expect(MAGIC_BYTE_SIGNATURES.has('text/plain')).toBe(false);
        expect(MAGIC_BYTE_SIGNATURES.has('text/csv')).toBe(false);
    });
});

describe('DOCUMENT_TYPE_LABELS', () => {
    it('maps all accepted MIME types to human-readable labels', () => {
        for (const mime of DOCUMENT_ACCEPTED_MIME_TYPES) {
            expect(DOCUMENT_TYPE_LABELS[mime]).toBeDefined();
            expect(typeof DOCUMENT_TYPE_LABELS[mime]).toBe('string');
        }
    });
});

describe('DOCUMENT_EXTENSIONS', () => {
    it('maps all accepted MIME types to file extensions', () => {
        expect(DOCUMENT_EXTENSIONS['application/pdf']).toBe('.pdf');
        expect(DOCUMENT_EXTENSIONS['text/plain']).toBe('.txt');
        expect(DOCUMENT_EXTENSIONS['text/csv']).toBe('.csv');
    });
});

describe('readFileMagicBytes', () => {
    it('reads the first N bytes of a file', async () => {
        const file = makeFileWithBytes('test.pdf', [0x25, 0x50, 0x44, 0x46, 0x2D], 'application/pdf');
        const bytes = await readFileMagicBytes(file, 4);
        expect(bytes).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    });

    it('returns fewer bytes if file is smaller than requested length', async () => {
        const file = makeFileWithBytes('tiny.bin', [0x01, 0x02], 'application/octet-stream');
        const bytes = await readFileMagicBytes(file, 4);
        expect(bytes.length).toBe(2);
    });
});

describe('validateMagicBytes', () => {
    it('passes for a valid PDF file', async () => {
        const file = makeFileWithBytes('doc.pdf', [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31], 'application/pdf');
        expect(await validateMagicBytes(file)).toBe(true);
    });

    it('fails for a spoofed PDF (wrong magic bytes)', async () => {
        const file = makeFileWithBytes('fake.pdf', [0x50, 0x4B, 0x03, 0x04], 'application/pdf');
        expect(await validateMagicBytes(file)).toBe(false);
    });

    it('fails for a PDF with too few bytes', async () => {
        const file = makeFileWithBytes('short.pdf', [0x25, 0x50], 'application/pdf');
        expect(await validateMagicBytes(file)).toBe(false);
    });

    it('passes for text/plain (no magic byte signature registered)', async () => {
        const file = makeFileWithBytes('notes.txt', [0x48, 0x65, 0x6C, 0x6C], 'text/plain');
        expect(await validateMagicBytes(file)).toBe(true);
    });

    it('passes for text/csv (no magic byte signature registered)', async () => {
        const file = makeFileWithBytes('data.csv', [0x6E, 0x61, 0x6D, 0x65], 'text/csv');
        expect(await validateMagicBytes(file)).toBe(true);
    });
});

describe('AttachmentMeta type', () => {
    it('allows a well-formed attachment metadata object', () => {
        const meta: AttachmentMeta = {
            filename: 'report.pdf',
            url: 'https://storage.example.com/report.pdf',
            thumbnailUrl: 'https://storage.example.com/report-thumb.png',
            parsedTextUrl: 'https://storage.example.com/report.txt',
            mimeType: 'application/pdf' as DocumentMimeType,
            sizeBytes: 1024 * 500,
        };
        expect(meta.filename).toBe('report.pdf');
        expect(meta.mimeType).toBe('application/pdf');
    });

    it('allows optional fields to be undefined', () => {
        const meta: AttachmentMeta = {
            filename: 'notes.txt',
            url: 'https://storage.example.com/notes.txt',
            mimeType: 'text/plain' as DocumentMimeType,
            sizeBytes: 256,
        };
        expect(meta.thumbnailUrl).toBeUndefined();
        expect(meta.parsedTextUrl).toBeUndefined();
    });

    it('allows extraction cache fields (backward-compatible)', () => {
        const meta: AttachmentMeta = {
            filename: 'invoice.pdf',
            url: 'https://storage.example.com/invoice.pdf',
            mimeType: 'application/pdf' as DocumentMimeType,
            sizeBytes: 2048,
            extraction: {
                classification: 'invoice',
                confidence: 'high',
                summary: 'Monthly invoice',
                keyFacts: ['Total: $500'],
                actionItems: [],
                questions: [],
                extendedFacts: ['Vendor: ACME'],
            },
            analyzedAt: Date.now(),
        };
        expect(meta.extraction?.classification).toBe('invoice');
        expect(meta.analyzedAt).toBeGreaterThan(0);
    });

    it('extraction and analyzedAt default to undefined for existing data', () => {
        const meta: AttachmentMeta = {
            filename: 'old.pdf',
            url: 'https://storage.example.com/old.pdf',
            mimeType: 'application/pdf' as DocumentMimeType,
            sizeBytes: 512,
        };
        expect(meta.extraction).toBeUndefined();
        expect(meta.analyzedAt).toBeUndefined();
    });
});
