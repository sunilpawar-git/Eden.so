/**
 * documentSummarizer.test.ts — Tests for document-level summary generation
 * Concatenates raw chunk contents and sends to Gemini for a cohesive summary
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/geminiClient', () => ({
    isGeminiAvailable: vi.fn(() => true),
    callGemini: vi.fn(),
    extractGeminiText: vi.fn(),
}));

vi.mock('../../utils/sanitizer', () => ({
    sanitizeContent: (s: string) => s,
}));

import { isGeminiAvailable, callGemini, extractGeminiText } from '../../services/geminiClient';
import { summarizeDocument } from '../../services/documentSummarizer';

const mockIsAvailable = vi.mocked(isGeminiAvailable);
const mockCallGemini = vi.mocked(callGemini);
const mockExtractText = vi.mocked(extractGeminiText);

describe('summarizeDocument', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsAvailable.mockReturnValue(true);
    });

    it('returns null when Gemini is unavailable', async () => {
        mockIsAvailable.mockReturnValue(false);
        const result = await summarizeDocument(['chunk1', 'chunk2'], 'Doc Title');
        expect(result).toBeNull();
        expect(mockCallGemini).not.toHaveBeenCalled();
    });

    it('returns null for empty chunk list', async () => {
        const result = await summarizeDocument([], 'Doc Title');
        expect(result).toBeNull();
    });

    it('concatenates raw chunk contents in order', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, data: {} } as never);
        mockExtractText.mockReturnValue('summary');

        await summarizeDocument(['first chunk', 'second chunk', 'third chunk'], 'My Doc');

        const callArgs = mockCallGemini.mock.calls[0]![0] as Record<string, unknown>;
        const contents = callArgs.contents as Array<{ parts: Array<{ text: string }> }>;
        const inputText = contents[0]!.parts[0]!.text;
        expect(inputText).toContain('first chunk');
        expect(inputText).toContain('second chunk');
        expect(inputText).toContain('third chunk');
        expect(inputText.indexOf('first chunk')).toBeLessThan(inputText.indexOf('second chunk'));
    });

    it('includes document title in the input', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, data: {} } as never);
        mockExtractText.mockReturnValue('summary');

        await summarizeDocument(['content'], 'Physical Security Notes');

        const callArgs = mockCallGemini.mock.calls[0]![0] as Record<string, unknown>;
        const contents = callArgs.contents as Array<{ parts: Array<{ text: string }> }>;
        const inputText = contents[0]!.parts[0]!.text;
        expect(inputText).toContain('Physical Security Notes');
    });

    it('truncates content at the context limit', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, data: {} } as never);
        mockExtractText.mockReturnValue('summary');

        const longChunk = 'x'.repeat(50_000);
        await summarizeDocument([longChunk], 'Doc');

        const callArgs = mockCallGemini.mock.calls[0]![0] as Record<string, unknown>;
        const contents = callArgs.contents as Array<{ parts: Array<{ text: string }> }>;
        const inputText = contents[0]!.parts[0]!.text;
        expect(inputText.length).toBeLessThanOrEqual(25_000 + 200);
    });

    it('returns summary on success', async () => {
        mockCallGemini.mockResolvedValue({ ok: true, data: {} } as never);
        mockExtractText.mockReturnValue('A comprehensive summary of the document.');

        const result = await summarizeDocument(['chunk1', 'chunk2'], 'Doc');
        expect(result).toBe('A comprehensive summary of the document.');
    });

    it('returns null on API failure (never throws)', async () => {
        mockCallGemini.mockResolvedValue({ ok: false } as never);

        const result = await summarizeDocument(['chunk1'], 'Doc');
        expect(result).toBeNull();
    });

    it('returns null on unexpected error (never throws)', async () => {
        mockCallGemini.mockRejectedValue(new Error('Network error'));

        const result = await summarizeDocument(['chunk1'], 'Doc');
        expect(result).toBeNull();
    });
});
