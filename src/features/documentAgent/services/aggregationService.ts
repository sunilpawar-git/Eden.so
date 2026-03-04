/**
 * Aggregation Service — periodic summaries across analyzed documents.
 * Groups by classification, builds prompt, parses response.
 * AI-facing text (exempt from localization).
 */
import { z } from 'zod';
import { captureError } from '@/shared/services/sentryService';
import { AGENT_INPUT_MAX_CHARS, AGENT_MAX_OUTPUT_TOKENS, AGENT_TEMPERATURE } from '../types/documentAgent';
import type { EntityIndexEntry } from '../types/entityIndex';

export const AGGREGATION_INTERVAL_DOCS = 5;
export const AGGREGATION_COOLDOWN_MS = 60 * 60 * 1000;

const AggregationSectionSchema = z.object({
    classification: z.string().catch(''),
    summary: z.string().catch(''),
});

const AggregationResponseSchema = z.object({
    sections: z.array(AggregationSectionSchema).catch([]),
});

export type AggregationResponse = z.infer<typeof AggregationResponseSchema>;

/** Check whether aggregation should trigger based on count and cooldown */
export function shouldTriggerAggregation(analysisCount: number, lastAggregationAt: number): boolean {
    if (analysisCount === 0) return false;
    if (analysisCount % AGGREGATION_INTERVAL_DOCS !== 0) return false;

    if (lastAggregationAt > 0) {
        const elapsed = Date.now() - lastAggregationAt;
        if (elapsed < AGGREGATION_COOLDOWN_MS) return false;
    }

    return true;
}

/** Group entity index entries by classification */
export function groupEntriesByClassification(
    entries: EntityIndexEntry[],
): Map<string, EntityIndexEntry[]> {
    const groups = new Map<string, EntityIndexEntry[]>();

    for (const entry of entries) {
        const existing = groups.get(entry.classification) ?? [];
        existing.push(entry);
        groups.set(entry.classification, existing);
    }

    return groups;
}

/** Build aggregation prompt from classification groups */
export function buildAggregationPrompt(groups: Map<string, EntityIndexEntry[]>): string {
    const sections: string[] = [];

    for (const [classification, entries] of groups) {
        const entities = entries.flatMap((e) => e.entities).join(', ');
        sections.push(`${classification} (${entries.length} documents): ${entities}`);
    }

    const prompt = `You are a document aggregation assistant. Summarize patterns across these analyzed documents grouped by type.

DOCUMENT GROUPS:
${sections.join('\n\n')}

Return a JSON object:
{
  "sections": [
    { "classification": "type", "summary": "pattern summary for this type" }
  ]
}

For each classification group, write a concise 1-2 sentence summary highlighting totals, patterns, and actionable insights.

Respond with ONLY the JSON object.`;

    return prompt.slice(0, AGENT_INPUT_MAX_CHARS);
}

/** Build request body for callGemini */
export function buildAggregationRequestBody(prompt: string) {
    return {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: AGENT_TEMPERATURE,
            maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
        },
    };
}

/** Strip markdown code fences */
function stripFences(text: string): string {
    return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

/** Parse aggregation response from Gemini */
export function parseAggregationResponse(responseText: string): AggregationResponse {
    const cleaned = stripFences(responseText);
    try {
        const parsed: unknown = JSON.parse(cleaned);
        return AggregationResponseSchema.parse(parsed);
    } catch (error: unknown) {
        captureError(error instanceof Error ? error : new Error('aggregation parse failed'));
        return AggregationResponseSchema.parse({});
    }
}
