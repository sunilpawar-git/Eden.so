/**
 * ImageDescriptionService Tests — Gemini Vision image description
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock geminiClient (SSOT for all Gemini calls)
vi.mock('../../services/geminiClient', () => ({
    isGeminiAvailable: vi.fn().mockReturnValue(true),
    callGemini: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } }),
    extractGeminiText: vi.fn().mockReturnValue(null),
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import { describeImageWithAI, blobToBase64 } from '../../services/imageDescriptionService';
// eslint-disable-next-line import-x/first
import { isGeminiAvailable, callGemini, extractGeminiText } from '../../services/geminiClient';

describe('imageDescriptionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isGeminiAvailable).mockReturnValue(true);
    });

    describe('blobToBase64', () => {
        it('converts a blob to base64 data string', async () => {
            const blob = new Blob(['hello'], { type: 'text/plain' });
            const base64 = await blobToBase64(blob);
            expect(typeof base64).toBe('string');
            expect(base64.length).toBeGreaterThan(0);
            expect(base64).not.toContain('data:');
        });
    });

    describe('describeImageWithAI', () => {
        it('returns AI-generated description on success', async () => {
            const geminiResponse = {
                candidates: [{
                    content: { parts: [{ text: 'A detailed chart showing revenue growth.' }] },
                }],
            };
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: geminiResponse });
            vi.mocked(extractGeminiText).mockReturnValue('A detailed chart showing revenue growth.');

            const blob = new Blob(['fake-image'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'chart.jpg');

            expect(description).toBe('A detailed chart showing revenue growth.');
        });

        it('sends request body with inlineData to callGemini', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue('desc');

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            await describeImageWithAI(blob, 'test.jpg');

            expect(callGemini).toHaveBeenCalledOnce();
            const body = vi.mocked(callGemini).mock.calls[0]![0];
            expect(body.contents[0]!.parts).toHaveLength(2);
            expect(body.generationConfig?.maxOutputTokens).toBe(512);
        });

        it('returns fallback description when Gemini is unavailable', async () => {
            vi.mocked(isGeminiAvailable).mockReturnValue(false);

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'photo.jpg');

            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);
            expect(callGemini).not.toHaveBeenCalled();
        });

        it('returns fallback description on API error', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: false, status: 500, data: null });

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'broken.jpg');

            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);
        });

        it('returns fallback on network failure', async () => {
            vi.mocked(callGemini).mockRejectedValue(new Error('Network error'));

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'offline.jpg');

            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);
        });

        it('returns fallback when extractGeminiText returns null', async () => {
            vi.mocked(callGemini).mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } });
            vi.mocked(extractGeminiText).mockReturnValue(null);

            const blob = new Blob(['image-data'], { type: 'image/jpeg' });
            const description = await describeImageWithAI(blob, 'empty.jpg');

            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);
        });
    });
});
