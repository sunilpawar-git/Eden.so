/**
 * SummarizationService Tests — Gemini-powered text summarization
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock geminiClient (SSOT for all Gemini calls)
vi.mock('../../services/geminiClient', () => ({
    isGeminiAvailable: vi.fn().mockReturnValue(true),
    callGemini: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } }),
    extractGeminiText: vi.fn().mockReturnValue(null),
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import { summarizeContent, shouldSummarize, getSummaryTier } from '../../services/summarizationService';
// eslint-disable-next-line import-x/first
import { KB_SUMMARY_THRESHOLD, KB_SUMMARY_TOKEN_LIMITS } from '../../types/knowledgeBank';
// eslint-disable-next-line import-x/first
import { isGeminiAvailable, callGemini, extractGeminiText } from '../../services/geminiClient';
// eslint-disable-next-line import-x/first
import { strings } from '@/shared/localization/strings';

describe('summarizationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isGeminiAvailable).mockReturnValue(true);
    });

    describe('shouldSummarize', () => {
        it('returns false for short text', () => {
            expect(shouldSummarize('Short text')).toBe(false);
        });

        it('returns false for exactly at threshold', () => {
            expect(shouldSummarize('x'.repeat(KB_SUMMARY_THRESHOLD))).toBe(false);
        });

        it('returns true for text above threshold', () => {
            expect(shouldSummarize('x'.repeat(KB_SUMMARY_THRESHOLD + 1))).toBe(true);
        });

        it('returns false for empty text', () => {
            expect(shouldSummarize('')).toBe(false);
        });
    });

    describe('summarizeContent', () => {
        it('returns summary from Gemini on success', async () => {
            vi.mocked(callGemini).mockResolvedValue({
                ok: true, status: 200,
                data: { candidates: [{ content: { parts: [{ text: 'AI summary' }] } }] },
            });
            vi.mocked(extractGeminiText).mockReturnValue('AI summary');

            const result = await summarizeContent('A very long article about AI...');
            expect(result).toBe('AI summary');
        });

        it('sends correct request body to callGemini', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('Summary');

            await summarizeContent('Content to summarize');

            expect(callGemini).toHaveBeenCalledOnce();
            const body = vi.mocked(callGemini).mock.calls[0]![0];
            expect(body.contents).toBeDefined();
            // Short content → brief tier → 128 tokens
            expect(body.generationConfig?.maxOutputTokens).toBe(KB_SUMMARY_TOKEN_LIMITS.brief);
            expect(body.generationConfig?.temperature).toBe(0.3);
        });

        it('returns null when Gemini is unavailable', async () => {
            vi.mocked(isGeminiAvailable).mockReturnValue(false);
            const result = await summarizeContent('Some long content');
            expect(result).toBeNull();
            expect(callGemini).not.toHaveBeenCalled();
        });

        it('returns null on API error', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: false, status: 500, data: null });

            const result = await summarizeContent('Some content');
            expect(result).toBeNull();
        });

        it('returns null on network failure', async () => {
            vi.mocked(callGemini).mockRejectedValue(new Error('Network error'));
            const result = await summarizeContent('Some content');
            expect(result).toBeNull();
        });

        it('returns null when extractGeminiText returns null', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue(null);

            const result = await summarizeContent('Some content');
            expect(result).toBeNull();
        });

        it('truncates content before sending to Gemini', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('Summary');

            const longContent = 'x'.repeat(10_000);
            await summarizeContent(longContent);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const text = body.contents[0]!.parts[0]!.text as string;
            // Should be truncated to MAX_SUMMARIZE_INPUT (6000)
            expect(text.length).toBeLessThanOrEqual(6_000);
        });

        it('sends prompt in systemInstruction, not in contents', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('Summary');

            await summarizeContent('Content to summarize');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            const userText = body.contents[0]!.parts[0]!.text as string;
            // System instruction should have the prompt
            expect(sysText).toContain('Summarize');
            // User content should NOT have the prompt, only the content
            expect(userText).toBe('Content to summarize');
        });
    });

    describe('getSummaryTier', () => {
        it('returns brief for content under 2000 chars', () => {
            expect(getSummaryTier('x'.repeat(1_999))).toBe('brief');
        });

        it('returns standard for content between 2000 and 5000 chars', () => {
            expect(getSummaryTier('x'.repeat(2_000))).toBe('standard');
            expect(getSummaryTier('x'.repeat(4_999))).toBe('standard');
        });

        it('returns detailed for content over 5000 chars', () => {
            expect(getSummaryTier('x'.repeat(5_000))).toBe('detailed');
            expect(getSummaryTier('x'.repeat(10_000))).toBe('detailed');
        });
    });

    describe('tiered summarization', () => {
        it('uses brief prompt and 128 tokens for short content', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('Brief summary');

            await summarizeContent('x'.repeat(1_000));

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).toContain(strings.knowledgeBank.summaryPromptBrief);
            expect(body.generationConfig?.maxOutputTokens).toBe(KB_SUMMARY_TOKEN_LIMITS.brief);
        });

        it('uses standard prompt and 256 tokens for medium content', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('Standard summary');

            await summarizeContent('x'.repeat(3_000));

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).toContain(strings.knowledgeBank.summaryPromptStandard);
            expect(body.generationConfig?.maxOutputTokens).toBe(KB_SUMMARY_TOKEN_LIMITS.standard);
        });

        it('uses detailed prompt and 512 tokens for long content', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('Detailed summary');

            await summarizeContent('x'.repeat(6_000));

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).toContain(strings.knowledgeBank.summaryPromptDetailed);
            expect(body.generationConfig?.maxOutputTokens).toBe(KB_SUMMARY_TOKEN_LIMITS.detailed);
        });
    });
});
