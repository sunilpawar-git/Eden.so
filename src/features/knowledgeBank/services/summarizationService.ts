/**
 * Summarization Service — Uses Gemini to generate concise summaries
 * Returns null on any failure (never throws, non-blocking)
 * Single responsibility: text content → summary string
 */
import { KB_SUMMARY_THRESHOLD } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { callGemini, isGeminiAvailable, extractGeminiText } from './geminiClient';

/** Max chars sent to Gemini for summarization (prevents API limits/timeouts) */
const MAX_SUMMARIZE_INPUT = 6000;

/** Check whether content is long enough to warrant summarization */
export function shouldSummarize(content: string): boolean {
    return content.length > KB_SUMMARY_THRESHOLD;
}

/**
 * Generate a concise summary of the given text using Gemini.
 * Returns null (never throws) if the API is unavailable or fails.
 */
export async function summarizeContent(content: string): Promise<string | null> {
    if (!isGeminiAvailable()) return null;

    try {
        const prompt = strings.knowledgeBank.summaryPrompt;
        const truncated = content.slice(0, MAX_SUMMARIZE_INPUT);
        const body = {
            contents: [{ parts: [{ text: `${prompt}\n\n${truncated}` }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 256,
            },
        };

        const result = await callGemini(body);
        if (!result.ok) return null;

        return extractGeminiText(result.data);
    } catch {
        return null;
    }
}
