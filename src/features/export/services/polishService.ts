/**
 * polishService — Optional AI pass to improve flow and transitions in exported markdown.
 * Uses generateContent (no context chain needed).
 * Graceful degradation: returns original on any error.
 */
import { generateContent } from '@/features/ai/services/geminiService';
import { exportStrings } from '../strings/exportStrings';
import { captureError } from '@/shared/services/sentryService';

export async function polishExport(rawMarkdown: string): Promise<string> {
    if (!rawMarkdown.trim()) return '';

    try {
        const prompt = `${exportStrings.prompts.polishInstruction}\n\n---\n\n${rawMarkdown}`;
        const polished = await generateContent(prompt);
        return polished;
    } catch (err: unknown) {
        captureError(err);
        return rawMarkdown;
    }
}
