/**
 * Gemini Service - AI content generation via API
 * NOTE: In production, this should call a Cloud Function to hide API key
 */
import { strings } from '@/shared/localization/strings';

const API_ENDPOINT = import.meta.env.VITE_GEMINI_API_ENDPOINT || '/api/generate';

/**
 * System prompts as defined in PRD Section 16
 */
const SYSTEM_PROMPTS = {
    singleNode: `You are a concise content generator.
Generate high-quality output based on the user prompt.
Avoid emojis unless explicitly requested.`,

    synthesis: `You are an idea synthesis engine.
Combine the following ideas into a new actionable output.
Avoid repetition.
Keep it concise.`,
};

interface GenerateResponse {
    content: string;
}

/**
 * Generate content from a single prompt
 */
export async function generateContent(prompt: string): Promise<string> {
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            systemPrompt: SYSTEM_PROMPTS.singleNode,
            userPrompt: prompt,
        }),
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error(strings.errors.quotaExceeded);
        }
        throw new Error(strings.errors.aiError);
    }

    const data: GenerateResponse = await response.json();
    return data.content;
}

/**
 * Synthesize content from multiple node contents
 */
export async function synthesizeNodes(nodeContents: string[]): Promise<string> {
    if (nodeContents.length < 2) {
        throw new Error('At least 2 nodes required for synthesis');
    }

    const combinedContent = nodeContents
        .map((content, i) => `[Idea ${i + 1}]: ${content}`)
        .join('\n\n');

    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            systemPrompt: SYSTEM_PROMPTS.synthesis,
            userPrompt: combinedContent,
            task: 'Combine these ideas into a single actionable output.',
        }),
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error(strings.errors.quotaExceeded);
        }
        throw new Error(strings.errors.aiError);
    }

    const data: GenerateResponse = await response.json();
    return data.content;
}
