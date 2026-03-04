/**
 * Document Agent Service Tests — Gemini integration, JSON parsing, error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { strings } from '@/shared/localization/strings';
import type { GeminiCallResult } from '@/features/knowledgeBank/services/geminiClient';
import { AGENT_INPUT_MAX_CHARS } from '../types/documentAgent';
import { createMockExtraction } from './fixtures/extractionFixtures';

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    callGemini: vi.fn(),
    extractGeminiText: vi.fn(),
}));

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { analyzeDocument } from '../services/documentAgentService';
import { callGemini, extractGeminiText } from '@/features/knowledgeBank/services/geminiClient';
import { captureError } from '@/shared/services/sentryService';
/* eslint-enable import-x/first */

const mockCallGemini = vi.mocked(callGemini);
const mockExtractText = vi.mocked(extractGeminiText);
const mockCaptureError = vi.mocked(captureError);

function makeGeminiResult(text: string): GeminiCallResult {
    return {
        ok: true,
        status: 200,
        data: { candidates: [{ content: { parts: [{ text }] } }] },
    };
}

const VALID_JSON = JSON.stringify(createMockExtraction({
    actionItems: ['Pay by Friday'],
    questions: ['Is auto-pay on?'],
}));

describe('analyzeDocument', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCallGemini.mockResolvedValue(makeGeminiResult(VALID_JSON));
        mockExtractText.mockReturnValue(VALID_JSON);
    });

    it('happy path: valid JSON returns typed ExtractionResult', async () => {
        const result = await analyzeDocument('Some document text', 'report.pdf');

        expect(result.classification).toBe('invoice');
        expect(result.confidence).toBe('high');
        expect(result.summary).toBe('Monthly bill');
        expect(result.keyFacts).toEqual(['Amount: $100']);
        expect(result.actionItems).toEqual(['Pay by Friday']);
        expect(result.questions).toEqual(['Is auto-pay on?']);
    });

    it('strips markdown fences before parsing', async () => {
        const fenced = `\`\`\`json\n${VALID_JSON}\n\`\`\``;
        mockExtractText.mockReturnValue(fenced);

        const result = await analyzeDocument('text', 'file.pdf');

        expect(result.classification).toBe('invoice');
    });

    it('missing fields get Zod defaults', async () => {
        const partial = JSON.stringify({ summary: 'Just a summary' });
        mockExtractText.mockReturnValue(partial);

        const result = await analyzeDocument('text', 'file.pdf');

        expect(result.classification).toBe('generic');
        expect(result.confidence).toBe('low');
        expect(result.keyFacts).toEqual([]);
        expect(result.actionItems).toEqual([]);
        expect(result.questions).toEqual([]);
    });

    it('completely invalid JSON retries once then throws', async () => {
        mockExtractText.mockReturnValue('not json at all');

        await expect(analyzeDocument('text', 'file.pdf')).rejects.toThrow();
        expect(mockCallGemini).toHaveBeenCalledTimes(2);
    });

    it('empty document text returns generic/low classification', async () => {
        const emptyResult = JSON.stringify({
            classification: 'generic',
            confidence: 'low',
            summary: '',
            keyFacts: [],
            actionItems: [],
            questions: [],
            extendedFacts: [],
        });
        mockExtractText.mockReturnValue(emptyResult);

        const result = await analyzeDocument('', 'empty.txt');

        expect(result.classification).toBe('generic');
        expect(result.confidence).toBe('low');
    });

    it('API 429 throws with quota message and calls captureError', async () => {
        mockCallGemini.mockResolvedValue({ ok: false, status: 429, data: null });

        await expect(analyzeDocument('text', 'file.pdf'))
            .rejects
            .toThrow(strings.errors.quotaExceeded);
        expect(mockCaptureError).toHaveBeenCalled();
    });

    it('API 500 throws with analysis failed message and calls captureError', async () => {
        mockCallGemini.mockResolvedValue({ ok: false, status: 500, data: null });

        await expect(analyzeDocument('text', 'file.pdf'))
            .rejects
            .toThrow(strings.documentAgent.analysisFailed);
        expect(mockCaptureError).toHaveBeenCalled();
    });

    it('network error throws with analysis failed message', async () => {
        mockCallGemini.mockRejectedValue(new Error('fetch failed'));

        await expect(analyzeDocument('text', 'file.pdf'))
            .rejects
            .toThrow(strings.documentAgent.analysisFailed);
        expect(mockCaptureError).toHaveBeenCalled();
    });

    it('truncates input longer than AGENT_INPUT_MAX_CHARS', async () => {
        const longText = 'x'.repeat(AGENT_INPUT_MAX_CHARS + 10_000);
        mockExtractText.mockReturnValue(VALID_JSON);

        await analyzeDocument(longText, 'big.pdf');

        const callArg = mockCallGemini.mock.calls[0]?.[0];
        const promptText = JSON.stringify(callArg);
        expect(promptText.length).toBeLessThan(longText.length + 1000);
    });

    it('sanitizes filename in prompt (no path traversal)', async () => {
        mockExtractText.mockReturnValue(VALID_JSON);

        await analyzeDocument('text', '../../etc/passwd');

        const callArg = mockCallGemini.mock.calls[0]?.[0];
        const prompt = JSON.stringify(callArg);
        expect(prompt).not.toContain('../');
    });

    it('null extractGeminiText triggers retry', async () => {
        mockExtractText.mockReturnValueOnce(null).mockReturnValueOnce(VALID_JSON);

        const result = await analyzeDocument('text', 'file.pdf');

        expect(result.classification).toBe('invoice');
        expect(mockCallGemini).toHaveBeenCalledTimes(2);
    });
});
