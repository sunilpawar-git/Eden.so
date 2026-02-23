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
// eslint-disable-next-line import-x/first
import { strings } from '@/shared/localization/strings';

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

        it('should retry once on transient failure then throw', async () => {
            mockError(500);
            await expect(generateContent('Test')).rejects.toThrow('AI generation failed');
            expect(callGemini).toHaveBeenCalledTimes(2);
        });

        it('should succeed on retry after transient failure', async () => {
            vi.mocked(callGemini)
                .mockResolvedValueOnce({ ok: false, status: 502, data: null })
                .mockResolvedValueOnce({
                    ok: true, status: 200,
                    data: { candidates: [{ content: { parts: [{ text: 'Retry OK' }] } }] },
                });
            vi.mocked(extractGeminiText).mockReturnValue('Retry OK');

            const result = await generateContent('Test');
            expect(result).toBe('Retry OK');
            expect(callGemini).toHaveBeenCalledTimes(2);
        });

        it('should throw immediately on quota exceeded without retry', async () => {
            mockError(429);
            await expect(generateContent('Test')).rejects.toThrow('quota exceeded');
            expect(callGemini).toHaveBeenCalledTimes(1);
        });

        it('should include KB usage guidance in systemInstruction when KB context provided', async () => {
            mockSuccess('KB response');
            const kbContext = '--- Workspace Knowledge Bank ---\n[Knowledge: Style]\nUse formal tone.\n--- End Knowledge Bank ---';
            await generateContent('Write a post', kbContext);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).toContain(strings.knowledgeBank.ai.kbUsageGuidance);
            expect(sysText).toContain(kbContext);
        });

        it('should NOT include KB usage guidance in systemInstruction when no KB context', async () => {
            mockSuccess('Response');
            await generateContent('Write a post');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).not.toContain('Knowledge Bank reference material');
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

        it('should use chain generation system prompt in systemInstruction', async () => {
            mockSuccess('Chain response');
            await generateContentWithContext('Build on this', ['Previous idea']);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).toContain('idea evolution');
        });

        it('should include KB usage guidance in systemInstruction when KB context provided', async () => {
            mockSuccess('KB-aware response');
            const kbContext = '--- Workspace Knowledge Bank ---\n[Knowledge: Brand]\nUse formal tone.\n--- End Knowledge Bank ---';
            await generateContentWithContext('Write a post', ['Idea 1'], kbContext);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).toContain(strings.knowledgeBank.ai.kbUsageGuidance);
            expect(sysText).toContain(kbContext);
        });

        it('should NOT include KB usage guidance in systemInstruction when no KB context', async () => {
            mockSuccess('Response');
            await generateContentWithContext('Write a post', ['Idea 1']);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).not.toContain('Knowledge Bank reference material');
        });

        it('should retry once on transient failure then throw', async () => {
            mockError(500);
            await expect(
                generateContentWithContext('Test', ['Context'])
            ).rejects.toThrow('AI generation failed');
            expect(callGemini).toHaveBeenCalledTimes(2);
        });

        it('should throw immediately on quota exceeded without retry', async () => {
            mockError(429);
            await expect(
                generateContentWithContext('Test', ['Context'])
            ).rejects.toThrow('quota exceeded');
            expect(callGemini).toHaveBeenCalledTimes(1);
        });
    });

    describe('transformContent', () => {
        it('should transform with refine prompt', async () => {
            mockSuccess('Refined content here');
            const result = await transformContent('Original text to improve', 'refine');
            expect(result).toBe('Refined content here');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const userText = body.contents[0]!.parts[0]!.text as string;
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(userText).toContain('Original text to improve');
            expect(sysText.toLowerCase()).toMatch(/refine|improve|enhance/);
        });

        it('should transform with shorten prompt', async () => {
            mockSuccess('Shorter version');
            const result = await transformContent('Long text that needs shortening', 'shorten');
            expect(result).toBe('Shorter version');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText.toLowerCase()).toMatch(/shorten|concise|brief/);
        });

        it('should transform with lengthen prompt', async () => {
            mockSuccess('Expanded content');
            const result = await transformContent('Brief note', 'lengthen');
            expect(result).toBe('Expanded content');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText.toLowerCase()).toMatch(/expand|lengthen|elaborate|detail/);
        });

        it('should transform with proofread prompt', async () => {
            mockSuccess('Proofread text');
            const result = await transformContent('Text with erors', 'proofread');
            expect(result).toBe('Proofread text');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText.toLowerCase()).toMatch(/proofread|grammar|spelling|correct/);
        });

        it('should retry once on transient failure then throw', async () => {
            mockError(500);
            await expect(
                transformContent('Some text', 'refine')
            ).rejects.toThrow('AI generation failed');
            expect(callGemini).toHaveBeenCalledTimes(2);
        });

        it('should throw immediately on quota exceeded without retry', async () => {
            mockError(429);
            await expect(transformContent('Some text', 'shorten')).rejects.toThrow('quota exceeded');
            expect(callGemini).toHaveBeenCalledTimes(1);
        });

        it('should include preserve meaning instructions in systemInstruction', async () => {
            mockSuccess('Transformed');
            await transformContent('Important meeting notes', 'refine');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText.toLowerCase()).toMatch(/preserve|maintain|keep.*meaning|original.*intent/);
        });

        it('should include KB transform guidance in systemInstruction when KB context provided', async () => {
            mockSuccess('Transformed');
            const kbContext = '--- Workspace Knowledge Bank ---\n[Knowledge: Tone]\nAlways formal.\n--- End Knowledge Bank ---';
            await transformContent('Draft text', 'refine', kbContext);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).toContain(strings.knowledgeBank.ai.kbTransformGuidance);
            expect(sysText).toContain(kbContext);
        });

        it('should NOT include KB transform guidance in systemInstruction when no KB context', async () => {
            mockSuccess('Transformed');
            await transformContent('Draft text', 'refine');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            expect(sysText).not.toContain('Knowledge Bank material');
        });
    });

    describe('systemInstruction separation', () => {
        it('generateContent sends system prompt in systemInstruction, user prompt in contents', async () => {
            mockSuccess('Response');
            await generateContent('Write a blog post');

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            const userText = body.contents[0]!.parts[0]!.text as string;
            expect(sysText).toContain('concise content generator');
            expect(userText).toContain('Write a blog post');
            expect(userText).not.toContain('concise content generator');
        });

        it('generateContentWithContext sends system + KB in systemInstruction', async () => {
            mockSuccess('Response');
            const kbContext = '--- KB ---\nBrand voice: formal\n--- End KB ---';
            await generateContentWithContext('Write post', ['Idea 1'], kbContext);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            const userText = body.contents[0]!.parts[0]!.text as string;
            expect(sysText).toContain('idea evolution');
            expect(sysText).toContain(strings.knowledgeBank.ai.kbUsageGuidance);
            expect(sysText).toContain(kbContext);
            expect(userText).toContain('Idea 1');
            expect(userText).toContain('Write post');
            expect(userText).not.toContain('idea evolution');
        });

        it('transformContent sends transform prompt in systemInstruction', async () => {
            mockSuccess('Refined');
            const kbContext = '--- KB ---\nTone: casual\n--- End KB ---';
            await transformContent('Draft text', 'refine', kbContext);

            const body = vi.mocked(callGemini).mock.calls[0]![0];
            const sysText = body.systemInstruction?.parts[0]?.text as string;
            const userText = body.contents[0]!.parts[0]!.text as string;
            expect(sysText).toContain('Refine and improve');
            expect(sysText).toContain(strings.knowledgeBank.ai.kbTransformGuidance);
            expect(sysText).toContain(kbContext);
            expect(userText).toContain('Draft text');
            expect(userText).not.toContain('Refine and improve');
        });
    });
});
