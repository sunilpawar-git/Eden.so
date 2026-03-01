/**
 * geminiPdfExtractor Tests — AI-powered PDF text extraction
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractPdfWithGemini } from '../../services/geminiPdfExtractor';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCallGemini = vi.fn();
const mockIsGeminiAvailable = vi.fn();
const mockExtractGeminiText = vi.fn();
const mockBlobToBase64 = vi.fn();

vi.mock('../../services/geminiClient', () => ({
    callGemini: (...args: unknown[]) => mockCallGemini(...args),
    isGeminiAvailable: () => mockIsGeminiAvailable(),
    extractGeminiText: (data: unknown) => mockExtractGeminiText(data),
}));

vi.mock('../../services/imageDescriptionService', () => ({
    blobToBase64: (...args: unknown[]) => mockBlobToBase64(...args),
}));

vi.mock('@/shared/localization/strings', () => ({
    strings: {
        knowledgeBank: {
            pdfExtractionPrompt: 'Extract all text from this PDF.',
        },
    },
}));

/** Build a File whose .size property matches the given byte count without allocating memory */
function makePdfFile(size = 100): File {
    const file = new File(['x'], 'scan.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: size, configurable: true });
    return file;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('extractPdfWithGemini', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsGeminiAvailable.mockReturnValue(true);
        mockBlobToBase64.mockResolvedValue('dGVzdA=='); // valid base64
        mockCallGemini.mockResolvedValue({ ok: true, status: 200, data: {} });
        mockExtractGeminiText.mockReturnValue('Extracted text.');
    });

    // ── Availability & size guards ─────────────────────────────────────────

    it('returns null when Gemini is unavailable', async () => {
        mockIsGeminiAvailable.mockReturnValue(false);
        expect(await extractPdfWithGemini(makePdfFile())).toBeNull();
        expect(mockCallGemini).not.toHaveBeenCalled();
    });

    it('returns null when file exceeds KB_MAX_FILE_SIZE without calling Gemini', async () => {
        const oversized = makePdfFile(11 * 1024 * 1024); // 11 MB > 10 MB limit
        expect(await extractPdfWithGemini(oversized)).toBeNull();
        expect(mockCallGemini).not.toHaveBeenCalled();
    });

    // ── Base64 encoding ────────────────────────────────────────────────────

    it('returns null when blobToBase64 produces empty string', async () => {
        mockBlobToBase64.mockResolvedValue('');
        expect(await extractPdfWithGemini(makePdfFile())).toBeNull();
        expect(mockCallGemini).not.toHaveBeenCalled();
    });

    it('returns null when blobToBase64 produces null/undefined', async () => {
        mockBlobToBase64.mockResolvedValue(null);
        expect(await extractPdfWithGemini(makePdfFile())).toBeNull();
        expect(mockCallGemini).not.toHaveBeenCalled();
    });

    // ── Request structure ──────────────────────────────────────────────────

    it('sends extraction prompt as systemInstruction, not inside contents.parts', async () => {
        await extractPdfWithGemini(makePdfFile());

        const [body] = mockCallGemini.mock.calls[0] as [{
            contents: Array<{ parts: unknown[] }>;
            systemInstruction?: { parts: Array<{ text: string }> };
        }];
        // Prompt must be in systemInstruction
        expect(body.systemInstruction?.parts[0]?.text).toBe('Extract all text from this PDF.');
        // Prompt must NOT leak into contents.parts
        const textPart = body.contents[0]!.parts.find(
            (p): p is { text: string } => typeof p === 'object' && p !== null && 'text' in p
        );
        expect(textPart).toBeUndefined();
    });

    it('includes inlineData with application/pdf mimeType and non-empty base64 data', async () => {
        await extractPdfWithGemini(makePdfFile());

        const [body] = mockCallGemini.mock.calls[0] as [{ contents: Array<{ parts: unknown[] }> }];
        const inlinePart = body.contents[0]!.parts.find(
            (p): p is { inlineData: { mimeType: string; data: string } } =>
                typeof p === 'object' && p !== null && 'inlineData' in p
        );
        expect(inlinePart?.inlineData.mimeType).toBe('application/pdf');
        expect(inlinePart?.inlineData.data).toBeTruthy();
    });

    it('uses near-zero temperature for deterministic extraction', async () => {
        await extractPdfWithGemini(makePdfFile());

        const [body] = mockCallGemini.mock.calls[0] as [{ generationConfig: { temperature: number } }];
        expect(body.generationConfig.temperature).toBeLessThanOrEqual(0.1);
    });

    // ── Response handling ──────────────────────────────────────────────────

    it('returns extracted text on successful Gemini response', async () => {
        mockExtractGeminiText.mockReturnValue('PDF content here.');
        expect(await extractPdfWithGemini(makePdfFile())).toBe('PDF content here.');
    });

    it('returns null when Gemini call is not ok', async () => {
        mockCallGemini.mockResolvedValue({ ok: false, status: 500, data: null });
        expect(await extractPdfWithGemini(makePdfFile())).toBeNull();
    });

    it('returns null when Gemini call throws', async () => {
        mockCallGemini.mockRejectedValue(new Error('Network error'));
        expect(await extractPdfWithGemini(makePdfFile())).toBeNull();
    });

    it('returns null when extractGeminiText returns null', async () => {
        mockExtractGeminiText.mockReturnValue(null);
        expect(await extractPdfWithGemini(makePdfFile())).toBeNull();
    });
});
