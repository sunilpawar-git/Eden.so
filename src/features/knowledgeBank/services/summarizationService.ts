/**
 * Summarization Service — Uses Gemini to generate concise summaries
 * Returns null on any failure (never throws, non-blocking)
 * Single responsibility: text content → summary string
 */
import {
    KB_SUMMARY_THRESHOLD,
    KB_SUMMARY_TIER_THRESHOLDS,
    KB_SUMMARY_TOKEN_LIMITS,
} from '../types/knowledgeBank';
import type { SummaryTier } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import { callGemini, isGeminiAvailable, extractGeminiText } from './geminiClient';

/** Max chars sent to Gemini for summarization (prevents API limits/timeouts) */
const MAX_SUMMARIZE_INPUT = 6000;

/** Check whether content is long enough to warrant summarization */
export function shouldSummarize(content: string): boolean {
    return content.length > KB_SUMMARY_THRESHOLD;
}

/** Determine summary depth tier based on content length */
export function getSummaryTier(content: string): SummaryTier {
    if (content.length >= KB_SUMMARY_TIER_THRESHOLDS.detailed) return 'detailed';
    if (content.length >= KB_SUMMARY_TIER_THRESHOLDS.standard) return 'standard';
    return 'brief';
}

/** Map each tier to its localized prompt string */
function getPromptForTier(tier: SummaryTier): string {
    const prompts: Record<SummaryTier, string> = {
        brief: strings.knowledgeBank.summaryPromptBrief,
        standard: strings.knowledgeBank.summaryPromptStandard,
        detailed: strings.knowledgeBank.summaryPromptDetailed,
    };
    return prompts[tier];
}

/**
 * Generate a concise summary of the given text using Gemini.
 * Uses tiered prompts & token limits based on content length.
 * Returns null (never throws) if the API is unavailable or fails.
 */
export async function summarizeContent(content: string): Promise<string | null> {
    if (!isGeminiAvailable()) return null;

    try {
        const tier = getSummaryTier(content);
        const prompt = getPromptForTier(tier);
        const truncated = content.slice(0, MAX_SUMMARIZE_INPUT);
        const body = {
            contents: [{ parts: [{ text: truncated }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: KB_SUMMARY_TOKEN_LIMITS[tier],
            },
            systemInstruction: { parts: [{ text: prompt }] },
        };

        const result = await callGemini(body);
        if (!result.ok) return null;

        return extractGeminiText(result.data);
    } catch {
        return null;
    }
}
