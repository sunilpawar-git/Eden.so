/**
 * Context Order Tests — Verifies NodePool appears BEFORE KB in system instructions
 * Priority order: BasePrompt → NodePool → KB
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    isGeminiAvailable: vi.fn().mockReturnValue(true),
    callGemini: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { candidates: [] } }),
    extractGeminiText: vi.fn().mockReturnValue(null),
}));

// eslint-disable-next-line import-x/first
import { generateContent, generateContentWithContext, transformContent } from '../services/geminiService';
// eslint-disable-next-line import-x/first
import { callGemini, extractGeminiText } from '@/features/knowledgeBank/services/geminiClient';

function mockSuccess(text: string) {
    vi.mocked(callGemini).mockResolvedValue({
        ok: true, status: 200,
        data: { candidates: [{ content: { parts: [{ text }] } }] },
    });
    vi.mocked(extractGeminiText).mockReturnValue(text);
}

const POOL_BLOCK = '--- AI Memory ---\n[Memory: Strategy]\nGrowth plan\n--- End AI Memory ---';
const KB_BLOCK = '--- Workspace Knowledge Bank ---\n[Knowledge: Brand]\nFormal tone\n--- End Knowledge Bank ---';

describe('Context priority order: NodePool before KB', () => {
    beforeEach(() => vi.clearAllMocks());

    it('generateContent places NodePool before KB in system instruction', async () => {
        mockSuccess('Response');
        await generateContent('Write', POOL_BLOCK, KB_BLOCK);

        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;

        const poolIdx = sysText.indexOf('AI Memory');
        const kbIdx = sysText.indexOf('Knowledge Bank');
        expect(poolIdx).toBeGreaterThan(-1);
        expect(kbIdx).toBeGreaterThan(-1);
        expect(poolIdx).toBeLessThan(kbIdx);
    });

    it('generateContentWithContext places NodePool before KB', async () => {
        mockSuccess('Response');
        await generateContentWithContext('Write', ['Idea'], POOL_BLOCK, KB_BLOCK);

        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;

        const poolIdx = sysText.indexOf('AI Memory');
        const kbIdx = sysText.indexOf('Knowledge Bank');
        expect(poolIdx).toBeLessThan(kbIdx);
    });

    it('transformContent places NodePool before KB', async () => {
        mockSuccess('Response');
        await transformContent('Text', 'refine', POOL_BLOCK, KB_BLOCK);

        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;

        const poolIdx = sysText.indexOf('AI Memory');
        const kbIdx = sysText.indexOf('Knowledge Bank');
        expect(poolIdx).toBeLessThan(kbIdx);
    });

    it('works with only NodePool context (no KB)', async () => {
        mockSuccess('Response');
        await generateContent('Write', POOL_BLOCK);

        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;

        expect(sysText).toContain('AI Memory');
        expect(sysText).not.toContain('Knowledge Bank');
    });

    it('works with only KB context (no NodePool)', async () => {
        mockSuccess('Response');
        await generateContent('Write', undefined, KB_BLOCK);

        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;

        expect(sysText).not.toContain('AI Memory');
        expect(sysText).toContain('Knowledge Bank');
    });

    it('works with neither context', async () => {
        mockSuccess('Response');
        await generateContent('Write');

        const body = vi.mocked(callGemini).mock.calls[0]![0];
        const sysText = body.systemInstruction?.parts[0]?.text as string;

        expect(sysText).not.toContain('AI Memory');
        expect(sysText).not.toContain('Knowledge Bank');
    });
});
