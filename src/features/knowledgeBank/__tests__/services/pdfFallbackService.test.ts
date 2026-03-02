/**
 * pdfFallbackService Tests — orchestration of scanned PDF Gemini fallback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseWithPdfFallback } from '../../services/pdfFallbackService';
import { ParserError } from '../../parsers/types';
import type { FileParser, ParseResult } from '../../parsers/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockExtractPdfWithGemini = vi.fn();
const mockChunkDocument = vi.fn();

vi.mock('../../services/geminiPdfExtractor', () => ({
    extractPdfWithGemini: (...args: unknown[]) => mockExtractPdfWithGemini(...args),
}));

vi.mock('../../services/chunkingService', () => ({
    chunkDocument: (...args: unknown[]) => mockChunkDocument(...args),
}));

vi.mock('../../utils/sanitizer', () => ({
    sanitizeContent: (text: string) => text,
}));

vi.mock('../../parsers/parserUtils', () => ({
    titleFromFilename: (name: string) => name.replace(/\.[^.]+$/, ''),
}));

vi.mock('@/shared/localization/strings', () => ({
    strings: {
        knowledgeBank: { errors: { pdfEmpty: 'PDF contains no extractable text' } },
    },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePdfFile(): File {
    return new File(['fake'], 'lecture.pdf', { type: 'application/pdf' });
}

function makeParser(result: ParseResult | Error): FileParser {
    return {
        supportedMimeTypes: ['application/pdf'] as const,
        supportedExtensions: ['.pdf'] as const,
        canParse: () => true,
        parse: result instanceof Error
            ? () => Promise.reject(result)
            : () => Promise.resolve(result),
    };
}

const successResult: ParseResult = {
    title: 'lecture',
    content: 'Normal text PDF content.',
    mimeType: 'application/pdf',
    originalFileName: 'lecture.pdf',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('parseWithPdfFallback', () => {
    const onFallback = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockChunkDocument.mockReturnValue([] as Array<{ title: string; content: string; index: number }>);
    });

    // ── Primary parser succeeds ────────────────────────────────────────────

    it('returns primary result when parser succeeds', async () => {
        const result = await parseWithPdfFallback(makeParser(successResult), makePdfFile(), onFallback);

        expect(result).toBe(successResult);
        expect(onFallback).not.toHaveBeenCalled();
        expect(mockExtractPdfWithGemini).not.toHaveBeenCalled();
    });

    // ── PDF_SCANNED fallback path ──────────────────────────────────────────

    it('calls onFallback BEFORE Gemini extraction begins (ordering guarantee)', async () => {
        const callOrder: string[] = [];
        const orderedFallback = vi.fn(() => { callOrder.push('notify'); });
        mockExtractPdfWithGemini.mockImplementation(async () => {
            callOrder.push('gemini');
            return 'AI extracted text.';
        });

        await parseWithPdfFallback(makeParser(new ParserError('no text', 'PDF_SCANNED')), makePdfFile(), orderedFallback);

        expect(callOrder).toEqual(['notify', 'gemini']);
    });

    it('calls onFallback exactly once for a scanned PDF', async () => {
        mockExtractPdfWithGemini.mockResolvedValue('Extracted from scanned page.');

        await parseWithPdfFallback(makeParser(new ParserError('no text', 'PDF_SCANNED')), makePdfFile(), onFallback);

        expect(onFallback).toHaveBeenCalledOnce();
    });

    it('returns Gemini result with correct fields when primary throws PDF_SCANNED', async () => {
        mockExtractPdfWithGemini.mockResolvedValue('Scanned content extracted by AI.');

        const result = await parseWithPdfFallback(makeParser(new ParserError('no text', 'PDF_SCANNED')), makePdfFile(), onFallback);

        expect(result.content).toBe('Scanned content extracted by AI.');
        expect(result.mimeType).toBe('application/pdf');
        expect(result.title).toBe('lecture');
        expect(result.originalFileName).toBe('lecture.pdf');
        expect(result.metadata?.aiExtracted).toBe('true');
    });

    it('maps chunks into ParseResult when chunkDocument returns sections', async () => {
        mockExtractPdfWithGemini.mockResolvedValue('Long document content.');
        mockChunkDocument.mockReturnValue([
            { title: 'lecture — Part 1', content: 'part one', index: 0 },
            { title: 'lecture — Part 2', content: 'part two', index: 1 },
        ]);

        const result = await parseWithPdfFallback(makeParser(new ParserError('no text', 'PDF_SCANNED')), makePdfFile(), onFallback);

        const chunks = result.chunks ?? [];
        expect(chunks).toHaveLength(2);
        expect(chunks[0]?.mimeType).toBe('application/pdf');
        expect(chunks[0]?.originalFileName).toBe('lecture.pdf');
        expect(chunks[1]?.content).toBe('part two');
    });

    it('produces no chunks when chunkDocument returns empty array', async () => {
        mockExtractPdfWithGemini.mockResolvedValue('Short text.');
        mockChunkDocument.mockReturnValue([]);

        const result = await parseWithPdfFallback(makeParser(new ParserError('no text', 'PDF_SCANNED')), makePdfFile(), onFallback);

        expect(result.chunks).toBeUndefined();
    });

    // ── Fallback failure paths ─────────────────────────────────────────────

    it('throws pdfEmpty when Gemini returns null', async () => {
        mockExtractPdfWithGemini.mockResolvedValue(null);

        await expect(
            parseWithPdfFallback(makeParser(new ParserError('no text', 'PDF_SCANNED')), makePdfFile(), onFallback)
        ).rejects.toMatchObject({ message: 'PDF contains no extractable text', code: 'PARSE_FAILED' });
    });

    it('throws pdfEmpty when Gemini returns blank string', async () => {
        mockExtractPdfWithGemini.mockResolvedValue('   ');

        await expect(
            parseWithPdfFallback(makeParser(new ParserError('no text', 'PDF_SCANNED')), makePdfFile(), onFallback)
        ).rejects.toMatchObject({ code: 'PARSE_FAILED' });
    });

    // ── Non-scanned errors pass through ───────────────────────────────────

    it('re-throws PARSE_FAILED errors without calling fallback', async () => {
        await expect(
            parseWithPdfFallback(makeParser(new ParserError('corrupt file', 'PARSE_FAILED')), makePdfFile(), onFallback)
        ).rejects.toMatchObject({ code: 'PARSE_FAILED', message: 'corrupt file' });

        expect(onFallback).not.toHaveBeenCalled();
        expect(mockExtractPdfWithGemini).not.toHaveBeenCalled();
    });

    it('re-throws generic errors without calling fallback', async () => {
        await expect(
            parseWithPdfFallback(makeParser(new Error('unexpected')), makePdfFile(), onFallback)
        ).rejects.toThrow('unexpected');

        expect(onFallback).not.toHaveBeenCalled();
    });
});
