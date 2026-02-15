/**
 * Gemini Service — AI content generation and transformation
 * Routes all API calls through geminiClient SSOT (proxy or direct)
 */
import { strings } from '@/shared/localization/strings';
import {
    callGemini, isGeminiAvailable, extractGeminiText,
} from '@/features/knowledgeBank/services/geminiClient';
import type { GeminiRequestBody } from '@/features/knowledgeBank/services/geminiClient';

/** Transformation types for AI-based text transformations (SSOT) */
export type TransformationType = 'refine' | 'shorten' | 'lengthen' | 'proofread';

// ── System Prompts ──────────────────────────────────────

const SYSTEM_PROMPTS = {
    singleNode: `You are a concise content generator.
Generate high-quality output based on the user prompt.
Avoid emojis unless explicitly requested.
Keep responses focused and actionable.`,

    chainGeneration: `You are an idea evolution engine.
The user has connected previous ideas in a chain.
Generate content that naturally builds upon and extends these connected ideas.
Show clear progression and synthesis from the context provided.
Keep it concise and actionable.`,
};

// ── Transformation Prompts ──────────────────────────────

const TRANSFORMATION_PROMPTS: Record<TransformationType, string> = {
    refine: `Refine and improve the following text while preserving its original meaning and intent.
Make it clearer, more polished, and better structured.
Keep the same length unless improvements require slight changes.`,

    shorten: `Make the following text more concise and brief while preserving its original meaning.
Remove unnecessary words and redundancy.
Keep all key information intact.`,

    lengthen: `Expand and elaborate on the following text while preserving its original meaning and intent.
Add more detail, examples, or explanation where appropriate.
Make it more comprehensive.`,

    proofread: `Proofread and correct the following text for grammar, spelling, and punctuation errors.
Preserve the original meaning and intent exactly.
Only fix errors, do not change the style or content.`,
};

// ── Response Handler ────────────────────────────────────

/** Extract text from a Gemini call result, throwing on errors */
async function callAndExtract(body: GeminiRequestBody): Promise<string> {
    const result = await callGemini(body);

    if (!result.ok) {
        if (result.status === 429) {
            throw new Error(strings.errors.quotaExceeded);
        }
        throw new Error(strings.errors.aiError);
    }

    if (result.data?.error) {
        throw new Error(result.data.error.message || strings.errors.aiError);
    }

    const text = extractGeminiText(result.data);
    if (!text) throw new Error(strings.errors.aiError);
    return text;
}

// ── Public API ──────────────────────────────────────────

/** Generate content from a single prompt */
export async function generateContent(
    prompt: string,
    knowledgeBankContext?: string
): Promise<string> {
    if (!isGeminiAvailable()) {
        throw new Error(strings.errors.aiError);
    }

    const kbSection = knowledgeBankContext ? `\n\n${knowledgeBankContext}\n` : '';
    const body: GeminiRequestBody = {
        contents: [{
            parts: [{ text: `${SYSTEM_PROMPTS.singleNode}${kbSection}\n\nUser request: ${prompt}` }],
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };

    return callAndExtract(body);
}

/** Generate content with upstream context from connected nodes */
export async function generateContentWithContext(
    prompt: string,
    contextChain: string[],
    knowledgeBankContext?: string
): Promise<string> {
    if (contextChain.length === 0) {
        return generateContent(prompt, knowledgeBankContext);
    }

    if (!isGeminiAvailable()) {
        throw new Error(strings.errors.aiError);
    }

    const contextSection = contextChain
        .map((content, i) => `[Connected Idea ${i + 1}]: ${content}`)
        .join('\n\n');

    const kbSection = knowledgeBankContext
        ? `\n\nWorkspace context:\n${knowledgeBankContext}\n`
        : '';

    const fullPrompt = `${SYSTEM_PROMPTS.chainGeneration}
${kbSection}
Connected ideas (from edge relationships):
${contextSection}

User's prompt: ${prompt}

Generate content that synthesizes and builds upon the connected ideas above.`;

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };

    return callAndExtract(body);
}

/** Transform content using AI (refine, shorten, lengthen, proofread) */
export async function transformContent(
    content: string,
    type: TransformationType,
    knowledgeBankContext?: string
): Promise<string> {
    if (!isGeminiAvailable()) {
        throw new Error(strings.errors.aiError);
    }

    const systemPrompt = TRANSFORMATION_PROMPTS[type];
    const kbSection = knowledgeBankContext
        ? `\n\nWorkspace context for reference:\n${knowledgeBankContext}\n`
        : '';

    const fullPrompt = `${systemPrompt}${kbSection}

Text to transform:
${content}

Transformed text:`;

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
    };

    return callAndExtract(body);
}
