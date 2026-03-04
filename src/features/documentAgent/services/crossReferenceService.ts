/**
 * Cross-Reference Service — generates cross-document insights via Gemini.
 * Pure prompt builder + response parser. AI-facing text (exempt from localization).
 */
import { z } from 'zod';
import { captureError } from '@/shared/services/sentryService';
import { AGENT_INPUT_MAX_CHARS, AGENT_MAX_OUTPUT_TOKENS, AGENT_TEMPERATURE } from '../types/documentAgent';
import { sanitizeFilename } from './documentAgentPrompts';
import type { ExtractionResult } from '../types/documentAgent';
import type { CrossReferenceMatch, CrossReferenceResult } from '../types/entityIndex';

export const CrossRefResultSchema = z.object({
    connections: z.array(z.string()).catch([]),
    contradictions: z.array(z.string()).catch([]),
    actionItems: z.array(z.string()).catch([]),
    relatedDocuments: z.array(z.string()).catch([]),
});

/** Strip markdown code fences from Gemini response */
function stripFences(text: string): string {
    return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
}

/** Build a cross-reference prompt from a new document and its matches */
export function buildCrossRefPrompt(
    newDoc: ExtractionResult,
    filename: string,
    matches: CrossReferenceMatch[],
): string {
    const safeName = sanitizeFilename(filename);
    const matchSections = matches.map((m, i) => {
        const overlap = m.overlappingEntities.join(', ');
        return `Document ${i + 1}: "${m.entry.filename}" (${m.entry.classification})
Summary: ${m.entry.summary}
Overlapping entities: ${overlap}`;
    }).join('\n\n');

    const prompt = `You are a cross-document analysis assistant. A new document has been analyzed and matches were found with existing documents in the workspace.

NEW DOCUMENT: "${safeName}" (${newDoc.classification})
Summary: ${newDoc.summary}
Key facts: ${newDoc.keyFacts.join(', ')}

MATCHED DOCUMENTS:
${matchSections}

Analyze the relationships between these documents and return a JSON object:
{
  "connections": array of connections or relationships found between documents,
  "contradictions": array of any contradictions or conflicts between documents,
  "actionItems": array of action items suggested by the cross-reference,
  "relatedDocuments": array of filenames that are most relevant
}

Respond with ONLY the JSON object. No explanation, no markdown fences.`;

    return prompt.slice(0, AGENT_INPUT_MAX_CHARS);
}

/** Build the request body for callGemini */
export function buildCrossRefRequestBody(prompt: string) {
    return {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: AGENT_TEMPERATURE,
            maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
        },
    };
}

/** Parse a cross-reference response from Gemini */
export function parseCrossRefResponse(responseText: string): CrossReferenceResult {
    const cleaned = stripFences(responseText);
    try {
        const parsed: unknown = JSON.parse(cleaned);
        return CrossRefResultSchema.parse(parsed);
    } catch (error: unknown) {
        captureError(error instanceof Error ? error : new Error('cross-ref parse failed'));
        return CrossRefResultSchema.parse({});
    }
}
