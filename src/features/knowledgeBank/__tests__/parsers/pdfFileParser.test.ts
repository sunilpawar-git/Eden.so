/**
 * PdfFileParser Tests — TDD RED/GREEN phase
 * Tests PDF parsing with mocked pdfjs-dist (dynamic import)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfFileParser } from '../../parsers/pdfFileParser';

// Mock pdfjs-dist (used via dynamic import in the parser)
const mockGetDocument = vi.fn();
vi.mock('pdfjs-dist', () => ({
    getDocument: mockGetDocument,
    GlobalWorkerOptions: { workerSrc: '' },
    version: '5.0.0',
}));

// Mock fileReaderUtil — overridden per-describe block where needed
const mockReadFileAsArrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
vi.mock('../../parsers/fileReaderUtil', () => ({
    readFileAsArrayBuffer: (...args: unknown[]) => mockReadFileAsArrayBuffer(...args),
}));

/** Helper to build a mock PDF document proxy */
function createMockPdfDoc(pageTexts: string[]) {
    const pages = pageTexts.map((text) => ({
        getTextContent: vi.fn().mockResolvedValue({
            items: text.split(' ').map((str) => ({ str, hasEOL: false })),
        }),
    }));

    return {
        promise: Promise.resolve({
            numPages: pages.length,
            getPage: vi.fn().mockImplementation((num: number) =>
                Promise.resolve(pages[num - 1])
            ),
        }),
    };
}

describe('PdfFileParser', () => {
    const parser = new PdfFileParser();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('supportedMimeTypes', () => {
        it('supports application/pdf', () => {
            expect(parser.supportedMimeTypes).toContain('application/pdf');
        });
    });

    describe('supportedExtensions', () => {
        it('supports .pdf', () => {
            expect(parser.supportedExtensions).toContain('.pdf');
        });
    });

    describe('canParse', () => {
        it('returns true for PDF files', () => {
            const file = new File(['fake'], 'doc.pdf', { type: 'application/pdf' });
            expect(parser.canParse(file)).toBe(true);
        });

        it('returns false for non-PDF files', () => {
            const file = new File(['fake'], 'doc.txt', { type: 'text/plain' });
            expect(parser.canParse(file)).toBe(false);
        });

        it('returns true for .pdf extension when MIME is empty', () => {
            const file = new File(['fake'], 'report.pdf', { type: '' });
            expect(parser.canParse(file)).toBe(true);
        });

        it('returns true for .pdf extension with wrong MIME type', () => {
            const file = new File(['fake'], 'doc.pdf', { type: 'application/octet-stream' });
            expect(parser.canParse(file)).toBe(true);
        });
    });

    describe('parse', () => {
        it('extracts text from single-page PDF', async () => {
            mockGetDocument.mockReturnValue(
                createMockPdfDoc(['Hello world from PDF'])
            );

            const file = new File(['fake-pdf'], 'report.pdf', { type: 'application/pdf' });
            const result = await parser.parse(file);

            expect(result.title).toBe('report');
            expect(result.content).toContain('Hello');
            expect(result.content).toContain('world');
            expect(result.mimeType).toBe('application/pdf');
            expect(result.originalFileName).toBe('report.pdf');
        });

        it('extracts text from multi-page PDF', async () => {
            mockGetDocument.mockReturnValue(
                createMockPdfDoc(['Page one text', 'Page two text'])
            );

            const file = new File(['fake-pdf'], 'multi.pdf', { type: 'application/pdf' });
            const result = await parser.parse(file);

            expect(result.content).toContain('Page');
            expect(result.content).toContain('one');
            expect(result.content).toContain('two');
        });

        it('strips extension from title', async () => {
            mockGetDocument.mockReturnValue(
                createMockPdfDoc(['text'])
            );

            const file = new File(['fake'], 'my-report.pdf', { type: 'application/pdf' });
            const result = await parser.parse(file);
            expect(result.title).toBe('my-report');
        });

        it('produces chunks for large PDFs', async () => {
            const largeText = 'word '.repeat(2000); // ~10K chars per page
            mockGetDocument.mockReturnValue(
                createMockPdfDoc([largeText, largeText])
            );

            const file = new File(['fake'], 'big.pdf', { type: 'application/pdf' });
            const result = await parser.parse(file);

            expect(result.chunks).toBeDefined();
            expect(result.chunks!.length).toBeGreaterThan(1);
        });

        it('has no chunks for small PDFs', async () => {
            mockGetDocument.mockReturnValue(
                createMockPdfDoc(['Short text'])
            );

            const file = new File(['fake'], 'small.pdf', { type: 'application/pdf' });
            const result = await parser.parse(file);
            expect(result.chunks).toBeUndefined();
        });

        it('throws PDF_SCANNED on empty PDF (signals scanned document)', async () => {
            mockGetDocument.mockReturnValue(
                createMockPdfDoc([''])
            );

            const file = new File(['fake'], 'empty.pdf', { type: 'application/pdf' });
            await expect(parser.parse(file)).rejects.toMatchObject({
                code: 'PDF_SCANNED',
            });
        });

        it('includes page count in metadata', async () => {
            mockGetDocument.mockReturnValue(
                createMockPdfDoc(['page1', 'page2', 'page3'])
            );

            const file = new File(['fake'], 'doc.pdf', { type: 'application/pdf' });
            const result = await parser.parse(file);
            expect(result.metadata?.pageCount).toBe('3');
        });
    });

    describe('parse — error propagation', () => {
        it('maps readFileAsArrayBuffer errors to the generic uploadFailed path (not a ParserError)', async () => {
            mockReadFileAsArrayBuffer.mockRejectedValueOnce(new Error('disk read error'));

            const file = new File(['fake'], 'broken.pdf', { type: 'application/pdf' });
            const error = await parser.parse(file).catch((e: unknown) => e);

            // Must be a plain Error, not a ParserError — so useFileProcessor maps it to uploadFailed
            expect(error).toBeInstanceOf(Error);
            expect((error as { code?: string }).code).toBeUndefined();
        });
    });
});
