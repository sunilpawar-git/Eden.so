/**
 * Shared LLM response utilities for document agent services.
 * SSOT for markdown fence stripping, bullet list formatting,
 * and Gemini request body construction.
 */
import { AGENT_TEMPERATURE, AGENT_MAX_OUTPUT_TOKENS } from '../types/documentAgent';
import type { GeminiRequestBody } from '@/features/knowledgeBank/services/geminiClient';

/** Strip markdown code fences from LLM output */
export function stripMarkdownFences(text: string): string {
    return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

/** Format an array of strings as a markdown bullet list */
export function formatBulletList(items: string[]): string {
    return items.map((item) => `- ${item}`).join('\n');
}

/** Build a standard Gemini request body for single-turn prompts */
export function buildGeminiRequestBody(
    prompt: string,
    overrides?: Partial<{ temperature: number; maxOutputTokens: number }>,
): GeminiRequestBody {
    return {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: AGENT_TEMPERATURE,
            maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
            ...overrides,
        },
    };
}
