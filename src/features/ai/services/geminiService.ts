/**
 * Gemini Service — AI content generation and transformation
 * Routes all API calls through geminiClient SSOT (proxy or direct)
 */
import { strings } from '@/shared/localization/strings';
import {
    callGemini, isGeminiAvailable, extractGeminiText,
} from '@/features/knowledgeBank/services/geminiClient';
import type { GeminiRequestBody } from '@/features/knowledgeBank/services/geminiClient';

// ── System Instruction Helpers ───────────────────────────

/** Max chars for the combined system instruction (~25k tokens) */
const MAX_SYSTEM_CHARS = 100_000;

/** Build system instruction text: base prompt + optional NodePool + optional KB.
 *  If total exceeds MAX_SYSTEM_CHARS, KB context is truncated (lower priority). */
function buildSystemText(
    basePrompt: string,
    nodePoolContext: string | undefined,
    nodePoolGuidance: string,
    knowledgeBankContext: string | undefined,
    kbGuidance: string
): string {
    let text = basePrompt;
    if (nodePoolContext) text += `\n\n${nodePoolGuidance}\n\n${nodePoolContext}`;

    if (knowledgeBankContext) {
        const kbBlock = `\n\n${kbGuidance}\n\n${knowledgeBankContext}`;
        const remaining = MAX_SYSTEM_CHARS - text.length;
        if (remaining >= kbBlock.length) {
            text += kbBlock;
        } else if (remaining > kbGuidance.length + 10) {
            text += kbBlock.slice(0, remaining);
        }
    }

    return text;
}

/** Build the systemInstruction field for Gemini API */
function buildSystemInstruction(
    basePrompt: string,
    nodePoolContext: string | undefined,
    nodePoolGuidance: string,
    knowledgeBankContext: string | undefined,
    kbGuidance: string
): { parts: Array<{ text: string }> } {
    const text = buildSystemText(basePrompt, nodePoolContext, nodePoolGuidance, knowledgeBankContext, kbGuidance);
    return { parts: [{ text }] };
}

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

const RETRY_DELAY_MS = 1000;

/** Parse a Gemini result, throwing on errors */
function parseResult(result: { ok: boolean; status: number; data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message: string; code: number } } | null }): string {
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

/** Call Gemini and extract text, retrying once on transient (non-429) failures */
async function callAndExtract(body: GeminiRequestBody): Promise<string> {
    const result = await callGemini(body);
    try {
        return parseResult(result);
    } catch (firstError) {
        const is429 = firstError instanceof Error
            && firstError.message === strings.errors.quotaExceeded;
        if (is429) throw firstError;

        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        const retryResult = await callGemini(body);
        return parseResult(retryResult);
    }
}

// ── Public API ──────────────────────────────────────────

/** Generate content from a single prompt */
export async function generateContent(
    prompt: string,
    nodePoolContext?: string,
    knowledgeBankContext?: string
): Promise<string> {
    if (!isGeminiAvailable()) {
        throw new Error(strings.errors.aiError);
    }

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: `User request: ${prompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        systemInstruction: buildSystemInstruction(
            SYSTEM_PROMPTS.singleNode,
            nodePoolContext,
            strings.nodePool.ai.usageGuidance,
            knowledgeBankContext,
            strings.knowledgeBank.ai.kbUsageGuidance
        ),
    };

    return callAndExtract(body);
}

/** Generate content with upstream context from connected nodes */
export async function generateContentWithContext(
    prompt: string,
    contextChain: string[],
    nodePoolContext?: string,
    knowledgeBankContext?: string
): Promise<string> {
    if (contextChain.length === 0) {
        return generateContent(prompt, nodePoolContext, knowledgeBankContext);
    }

    if (!isGeminiAvailable()) {
        throw new Error(strings.errors.aiError);
    }

    const contextSection = contextChain
        .map((content, i) => `[Connected Idea ${i + 1}]: ${content}`)
        .join('\n\n');

    const userPrompt = `Connected ideas (from edge relationships):
${contextSection}

User's prompt: ${prompt}

Generate content that synthesizes and builds upon the connected ideas above.`;

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        systemInstruction: buildSystemInstruction(
            SYSTEM_PROMPTS.chainGeneration,
            nodePoolContext,
            strings.nodePool.ai.usageGuidance,
            knowledgeBankContext,
            strings.knowledgeBank.ai.kbUsageGuidance
        ),
    };

    return callAndExtract(body);
}

/** Transform content using AI (refine, shorten, lengthen, proofread) */
export async function transformContent(
    content: string,
    type: TransformationType,
    nodePoolContext?: string,
    knowledgeBankContext?: string
): Promise<string> {
    if (!isGeminiAvailable()) {
        throw new Error(strings.errors.aiError);
    }

    const userPrompt = `Text to transform:
${content}

Transformed text:`;

    const body: GeminiRequestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
        systemInstruction: buildSystemInstruction(
            TRANSFORMATION_PROMPTS[type],
            nodePoolContext,
            strings.nodePool.ai.transformGuidance,
            knowledgeBankContext,
            strings.knowledgeBank.ai.kbTransformGuidance
        ),
    };

    return callAndExtract(body);
}
