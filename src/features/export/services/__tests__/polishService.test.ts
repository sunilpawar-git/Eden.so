import { describe, test, expect, vi, afterEach } from 'vitest';
import { exportStrings } from '../../strings/exportStrings';

const mockGenerateContent = vi.fn();

vi.mock('@/features/ai/services/geminiService', () => ({
    generateContent: (...args: unknown[]) => mockGenerateContent(...args),
}));

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

// Must import after vi.mock so the mock is applied
const { polishExport } = await import('../polishService');

describe('polishExport', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('calls generateContent with prompt containing polishInstruction', async () => {
        mockGenerateContent.mockResolvedValue('polished output');
        await polishExport('# Hello');
        expect(mockGenerateContent).toHaveBeenCalledOnce();
        const prompt = mockGenerateContent.mock.calls[0]![0] as string;
        expect(prompt).toContain(exportStrings.prompts.polishInstruction);
    });

    test('returns Gemini response as polished markdown', async () => {
        mockGenerateContent.mockResolvedValue('improved doc');
        const result = await polishExport('raw');
        expect(result).toBe('improved doc');
    });

    test('Gemini error returns original rawMarkdown', async () => {
        mockGenerateContent.mockRejectedValue(new Error('API failure'));
        const result = await polishExport('original content');
        expect(result).toBe('original content');
    });

    test('empty markdown returns empty string without API call', async () => {
        const result = await polishExport('');
        expect(result).toBe('');
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    test('whitespace-only markdown returns empty string without API call', async () => {
        const result = await polishExport('   \n  ');
        expect(result).toBe('');
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    test('prompt uses exportStrings.prompts.polishInstruction, not hardcoded', async () => {
        mockGenerateContent.mockResolvedValue('ok');
        await polishExport('content');
        const prompt = mockGenerateContent.mock.calls[0]![0] as string;
        expect(prompt.startsWith(exportStrings.prompts.polishInstruction)).toBe(true);
    });

    test('raw markdown appears after --- delimiter in prompt', async () => {
        mockGenerateContent.mockResolvedValue('ok');
        await polishExport('my raw md');
        const prompt = mockGenerateContent.mock.calls[0]![0] as string;
        const parts = prompt.split('---');
        expect(parts.length).toBeGreaterThanOrEqual(2);
        expect(parts[parts.length - 1]!).toContain('my raw md');
    });
});
