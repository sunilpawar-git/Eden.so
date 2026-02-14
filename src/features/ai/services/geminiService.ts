/**
 * Gemini Service - AI content generation
 * Updated to use direct Gemini API with API key
 */
import { strings } from '@/shared/localization/strings';

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Transformation types for AI-based text transformations (SSOT)
 */
export type TransformationType = 'refine' | 'shorten' | 'lengthen' | 'proofread';

/**
 * System prompts for AI generation
 */
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

/**
 * Transformation prompts - preserve original meaning while transforming
 */
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

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: {
        message: string;
        code: number;
    };
}

/**
 * Generate content from a single prompt using Gemini API
 */
export async function generateContent(prompt: string, knowledgeBankContext?: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env.local');
    }

    const kbSection = knowledgeBankContext ? `\n\n${knowledgeBankContext}\n` : '';

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: `${SYSTEM_PROMPTS.singleNode}${kbSection}\n\nUser request: ${prompt}` }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
        },
    };

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error(strings.errors.quotaExceeded);
        }
        throw new Error(strings.errors.aiError);
    }

    const data = await response.json() as GeminiResponse;

    if (data.error) {
        throw new Error(data.error.message || strings.errors.aiError);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error(strings.errors.aiError);
    }

    return text;
}

/**
 * Generate content with upstream context from connected nodes
 * Uses edge-aware context for Obsidian-style idea chaining
 */

export async function generateContentWithContext(
    prompt: string,
    contextChain: string[],
    knowledgeBankContext?: string
): Promise<string> {
    // If no context, delegate to simple generation
    if (contextChain.length === 0) {
        return generateContent(prompt, knowledgeBankContext);
    }

    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env.local');
    }

    // Build context section from connected nodes
    const contextSection = contextChain
        .map((content, i) => `[Connected Idea ${i + 1}]: ${content}`)
        .join('\n\n');

    const kbSection = knowledgeBankContext ? `\n\nWorkspace context:\n${knowledgeBankContext}\n` : '';

    const fullPrompt = `${SYSTEM_PROMPTS.chainGeneration}
${kbSection}
Connected ideas (from edge relationships):
${contextSection}

User's prompt: ${prompt}

Generate content that synthesizes and builds upon the connected ideas above.`;

    const requestBody = {
        contents: [
            {
                parts: [{ text: fullPrompt }],
            },
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
        },
    };

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error(strings.errors.quotaExceeded);
        }
        throw new Error(strings.errors.aiError);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- typed as GeminiResponse
    const data: GeminiResponse = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error(strings.errors.aiError);
    }

    return text;
}

/**
 * Transform existing content using AI (refine, shorten, lengthen, proofread)
 * Preserves original meaning while applying the transformation
 */
export async function transformContent(
    content: string,
    type: TransformationType,
    knowledgeBankContext?: string
): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env.local');
    }

    const systemPrompt = TRANSFORMATION_PROMPTS[type];
    const kbSection = knowledgeBankContext ? `\n\nWorkspace context for reference:\n${knowledgeBankContext}\n` : '';
    const fullPrompt = `${systemPrompt}${kbSection}

Text to transform:
${content}

Transformed text:`;

    const requestBody = {
        contents: [
            {
                parts: [{ text: fullPrompt }],
            },
        ],
        generationConfig: {
            temperature: 0.5, // Lower temperature for more consistent transformations
            maxOutputTokens: 1024,
        },
    };

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error(strings.errors.quotaExceeded);
        }
        throw new Error(strings.errors.aiError);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- typed as GeminiResponse
    const data: GeminiResponse = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error(strings.errors.aiError);
    }

    return text;
}
