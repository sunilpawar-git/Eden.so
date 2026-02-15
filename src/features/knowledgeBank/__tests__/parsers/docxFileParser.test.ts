/**
 * DocxFileParser Tests — TDD RED/GREEN phase
 * Tests DOCX parsing with mocked mammoth (dynamic import)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocxFileParser } from '../../parsers/docxFileParser';

// Mock mammoth (used via dynamic import in the parser)
const mockExtractRawText = vi.fn();
vi.mock('mammoth', () => ({
    extractRawText: mockExtractRawText,
}));

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('DocxFileParser', () => {
    const parser = new DocxFileParser();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('supportedMimeTypes', () => {
        it('supports the standard DOCX MIME type', () => {
            expect(parser.supportedMimeTypes).toContain(DOCX_MIME);
        });
    });

    describe('supportedExtensions', () => {
        it('supports .docx', () => {
            expect(parser.supportedExtensions).toContain('.docx');
        });
    });

    describe('canParse', () => {
        it('returns true for DOCX files by MIME type', () => {
            const file = new File(['fake'], 'doc.docx', { type: DOCX_MIME });
            expect(parser.canParse(file)).toBe(true);
        });

        it('returns true for DOCX files by extension when MIME is empty', () => {
            const file = new File(['fake'], 'doc.docx', { type: '' });
            expect(parser.canParse(file)).toBe(true);
        });

        it('returns false for non-DOCX files', () => {
            const file = new File(['fake'], 'doc.pdf', { type: 'application/pdf' });
            expect(parser.canParse(file)).toBe(false);
        });
    });

    describe('parse', () => {
        it('extracts text from a DOCX file', async () => {
            mockExtractRawText.mockResolvedValue({
                value: 'Hello from Word document',
            });

            const file = new File(['fake-docx'], 'report.docx', { type: DOCX_MIME });
            const result = await parser.parse(file);

            expect(result.title).toBe('report');
            expect(result.content).toContain('Hello from Word document');
            expect(result.mimeType).toBe(DOCX_MIME);
            expect(result.originalFileName).toBe('report.docx');
        });

        it('strips extension from title', async () => {
            mockExtractRawText.mockResolvedValue({ value: 'text' });

            const file = new File(['fake'], 'my-proposal.docx', { type: DOCX_MIME });
            const result = await parser.parse(file);
            expect(result.title).toBe('my-proposal');
        });

        it('produces chunks for large documents', async () => {
            const largeText = 'word '.repeat(2000); // ~10K chars
            mockExtractRawText.mockResolvedValue({ value: largeText });

            const file = new File(['fake'], 'big.docx', { type: DOCX_MIME });
            const result = await parser.parse(file);

            expect(result.chunks).toBeDefined();
            expect(result.chunks!.length).toBeGreaterThan(1);
        });

        it('has no chunks for small documents', async () => {
            mockExtractRawText.mockResolvedValue({ value: 'Short text' });

            const file = new File(['fake'], 'small.docx', { type: DOCX_MIME });
            const result = await parser.parse(file);
            expect(result.chunks).toBeUndefined();
        });

        it('throws on empty document', async () => {
            mockExtractRawText.mockResolvedValue({ value: '' });

            const file = new File(['fake'], 'empty.docx', { type: DOCX_MIME });
            await expect(parser.parse(file)).rejects.toThrow();
        });

        it('throws on extraction failure', async () => {
            mockExtractRawText.mockRejectedValue(new Error('corrupt file'));

            const file = new File(['fake'], 'corrupt.docx', { type: DOCX_MIME });
            await expect(parser.parse(file)).rejects.toThrow();
        });

        it('sanitizes extracted content', async () => {
            mockExtractRawText.mockResolvedValue({
                value: 'Hello <script>alert("xss")</script> World',
            });

            const file = new File(['fake'], 'xss.docx', { type: DOCX_MIME });
            const result = await parser.parse(file);
            expect(result.content).not.toContain('<script>');
        });
    });
});
