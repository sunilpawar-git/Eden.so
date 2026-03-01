/**
 * Document Summarizer — Generates a whole-document summary from raw chunk contents
 * Concatenates all chunk contents and calls Gemini for a cohesive summary.
 * Never throws — returns null on any failure.
 */
import { strings } from '@/shared/localization/strings';
import { sanitizeContent } from '../utils/sanitizer';
import { callGemini, isGeminiAvailable, extractGeminiText } from './geminiClient';

const MAX_DOCUMENT_INPUT = 25_000;
const MAX_OUTPUT_TOKENS = 512;

/**
 * Generate a cohesive summary from raw chunk contents of a single document.
 * Uses the full raw text (not chunk summaries) to avoid information loss.
 */
export async function summarizeDocument(
    chunkContents: string[],
    docTitle: string
): Promise<string | null> {
    if (!isGeminiAvailable() || chunkContents.length === 0) return null;

    try {
        const combined = chunkContents.map((c) => sanitizeContent(c)).join('\n\n');
        const truncated = combined.slice(0, MAX_DOCUMENT_INPUT);
        const sanitizedTitle = sanitizeContent(docTitle);
        const input = `Document: ${sanitizedTitle}\n\n${truncated}`;

        const body = {
            contents: [{ parts: [{ text: input }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: MAX_OUTPUT_TOKENS },
            systemInstruction: {
                parts: [{ text: strings.knowledgeBank.documentSummaryPrompt }],
            },
        };

        const result = await callGemini(body);
        if (!result.ok) return null;

        return extractGeminiText(result.data);
    } catch (error) {
        console.warn('Document summarization failed', error);
        return null;
    }
}
