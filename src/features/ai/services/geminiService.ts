/**
 * Gemini Service - AI content generation
 * Updated to use direct Gemini API with API key
 */
import { strings } from '@/shared/localization/strings';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * System prompts as defined in PRD Section 16
 */
const SYSTEM_PROMPTS = {
    singleNode: `You are a concise content generator.
Generate high-quality output based on the user prompt.
Avoid emojis unless explicitly requested.
Keep responses focused and actionable.`,

    synthesis: `You are an idea synthesis engine.
Combine the following ideas into a new actionable output.
Avoid repetition.
Keep it concise and insightful.`,
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
export async function generateContent(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env.local');
    }

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: `${SYSTEM_PROMPTS.singleNode}\n\nUser request: ${prompt}` }
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

    const data: GeminiResponse = await response.json();

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
 * Synthesize content from multiple node contents
 */
export async function synthesizeNodes(nodeContents: string[]): Promise<string> {
    if (nodeContents.length < 2) {
        throw new Error('At least 2 nodes required for synthesis');
    }

    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env.local');
    }

    const combinedContent = nodeContents
        .map((content, i) => `[Idea ${i + 1}]: ${content}`)
        .join('\n\n');

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: `${SYSTEM_PROMPTS.synthesis}\n\n${combinedContent}\n\nCombine these ideas into a single actionable output.`
                    }
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

    const data: GeminiResponse = await response.json();

    if (data.error) {
        throw new Error(data.error.message || strings.errors.aiError);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error(strings.errors.aiError);
    }

    return text;
}
