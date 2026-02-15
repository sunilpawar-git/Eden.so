/**
 * Gemini Service Tests — AI content generation and transformation
 * Tests use mocked geminiClient SSOT
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock geminiClient
vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    isGeminiAvailable: vi.fn().mockReturnValue(true),
    callGemini: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } }),
    extractGeminiText: vi.fn().mockReturnValue(null),
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import {
    generateContent,
    generateContentWithContext,
    transformContent,
} from '../services/geminiService';
// eslint-disable-next-line import-x/first
import { callGemini, extractGeminiText, isGeminiAvailable } from '@/features/knowledgeBank/services/geminiClient';

function mockSuccess(text: string) {
    vi.mocked(callGemini).mockResolvedValue({
        ok: true, status: 200,
        data: { candidates: [{ content: { parts: [{ text }] } }] },
    });
    vi.mocked(extractGeminiText).mockReturnValue(text);
}

function mockError(status: number) {
    vi.mocked(callGemini).mockResolvedValue({
        ok: false, status, data: null,
    });
}

describe('GeminiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isGeminiAvailable).mockReturnValue(true);
    });

    describe('generateContent', () => {
        it('should return generated text on success', async () => {
            mockSuccess('Generated response');
            const result = await generateContent('Create a LinkedIn post');
            expect(callGemini).toHaveBeenCalledTimes(1);
            expect(result).toBe('Generated response');
        });

        it('should throw error on API failure', async () => {
            mockError(500);
            await expect(generateContent('Test')).rejects.toThrow('AI generation failed');
        });

        it('should throw error on quota exceeded', async () => {
            mockError(429);
            await expect(generateContent('Test')).rejects.toThrow('quota exceeded');
        });
    });

    describe('generateContentWithContext', () => {
        it('should call generateContent directly when context is empty', async () => {
            mockSuccess('Direct response');
            const result = await generateContentWithContext('Create something', []);
            expect(callGemini).toHaveBeenCalledTimes(1);
            expect(result).toBe('Direct response');
        });

        it('should include all context items in request', async () => {
            mockSuccess('Context-aware response');
            const contextChain = ['New York info', 'Washington info'];
            const result = await generateContentWithContext('Tell me about US cities', contextChain);
            expect(result).toBe('Context-aware response');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const promptText = body.contents[0]!.parts[0]!.text as string;
            expect(promptText).toContain('New York info');
            expect(promptText).toContain('Washington info');
            expect(promptText).toContain('Tell me about US cities');
        });

        it('should use chain generation system prompt', async () => {
            mockSuccess('Chain response');
            await generateContentWithContext('Build on this', ['Previous idea']);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const promptText = body.contents[0]!.parts[0]!.text as string;
            expect(promptText).toContain('idea evolution');
        });

        it('should handle API errors correctly', async () => {
            mockError(500);
            await expect(
                generateContentWithContext('Test', ['Context'])
            ).rejects.toThrow('AI generation failed');
        });

        it('should handle quota exceeded errors', async () => {
            mockError(429);
            await expect(
                generateContentWithContext('Test', ['Context'])
            ).rejects.toThrow('quota exceeded');
        });
    });

    describe('transformContent', () => {
        it('should transform with refine prompt', async () => {
            mockSuccess('Refined content here');
            const result = await transformContent('Original text to improve', 'refine');
            expect(result).toBe('Refined content here');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const text = body.contents[0]!.parts[0]!.text as string;
            expect(text).toContain('Original text to improve');
            expect(text.toLowerCase()).toMatch(/refine|improve|enhance/);
        });

        it('should transform with shorten prompt', async () => {
            mockSuccess('Shorter version');
            const result = await transformContent('Long text that needs shortening', 'shorten');
            expect(result).toBe('Shorter version');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const text = body.contents[0]!.parts[0]!.text as string;
            expect(text.toLowerCase()).toMatch(/shorten|concise|brief/);
        });

        it('should transform with lengthen prompt', async () => {
            mockSuccess('Expanded content');
            const result = await transformContent('Brief note', 'lengthen');
            expect(result).toBe('Expanded content');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const text = body.contents[0]!.parts[0]!.text as string;
            expect(text.toLowerCase()).toMatch(/expand|lengthen|elaborate|detail/);
        });

        it('should transform with proofread prompt', async () => {
            mockSuccess('Proofread text');
            const result = await transformContent('Text with erors', 'proofread');
            expect(result).toBe('Proofread text');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const text = body.contents[0]!.parts[0]!.text as string;
            expect(text.toLowerCase()).toMatch(/proofread|grammar|spelling|correct/);
        });

        it('should handle API errors correctly', async () => {
            mockError(500);
            await expect(transformContent('Some text', 'refine')).rejects.toThrow('AI generation failed');
        });

        it('should handle quota exceeded errors', async () => {
            mockError(429);
            await expect(transformContent('Some text', 'shorten')).rejects.toThrow('quota exceeded');
        });

        it('should include preserve meaning instructions', async () => {
            mockSuccess('Transformed');
            await transformContent('Important meeting notes', 'refine');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const text = body.contents[0]!.parts[0]!.text as string;
            expect(text.toLowerCase()).toMatch(/preserve|maintain|keep.*meaning|original.*intent/);
        });
    });
});
