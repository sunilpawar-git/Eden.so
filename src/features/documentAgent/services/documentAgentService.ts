/**
 * Document Agent Service — single Gemini call for document extraction.
 * Validates response with Zod, retries once on malformed JSON.
 */
import { callGemini, extractGeminiText } from '@/features/knowledgeBank/services/geminiClient';
import type { GeminiRequestBody } from '@/features/knowledgeBank/services/geminiClient';
import { captureError } from '@/shared/services/sentryService';
import { strings } from '@/shared/localization/strings';
import {
    ExtractionResultSchema,
    AGENT_TEMPERATURE,
    AGENT_MAX_OUTPUT_TOKENS,
} from '../types/documentAgent';
import type { ExtractionResult } from '../types/documentAgent';
import { buildExtractionPrompt, JSON_RETRY_INSTRUCTION } from './documentAgentPrompts';
import { stripMarkdownFences } from '../utils/llmResponseUtils';

/** Attempt to parse and validate JSON text into ExtractionResult */
function parseExtractionJson(text: string): ExtractionResult {
    const cleaned = stripMarkdownFences(text.trim());
    const raw: unknown = JSON.parse(cleaned);
    return ExtractionResultSchema.parse(raw);
}

/** Build the Gemini request body for an extraction prompt */
function buildRequestBody(prompt: string): GeminiRequestBody {
    return {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: AGENT_TEMPERATURE,
            maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
        },
    };
}

/** Build a retry request body asking Gemini to fix its JSON */
function buildRetryBody(prompt: string, badResponse: string): GeminiRequestBody {
    return {
        contents: [
            { parts: [{ text: prompt }] },
            { parts: [{ text: badResponse }] },
            { parts: [{ text: JSON_RETRY_INSTRUCTION }] },
        ],
        generationConfig: {
            temperature: AGENT_TEMPERATURE,
            maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
        },
    };
}

/**
 * Analyze a document via Gemini and return structured extraction results.
 * Retries once on malformed JSON. Throws on API or persistent parse errors.
 */
export async function analyzeDocument(
    parsedText: string,
    filename: string,
): Promise<ExtractionResult> {
    const prompt = buildExtractionPrompt(parsedText, filename);

    let geminiResult;
    try {
        geminiResult = await callGemini(buildRequestBody(prompt));
    } catch (error: unknown) {
        captureError(error instanceof Error ? error : new Error(strings.documentAgent.analysisFailed), { filename });
        throw new Error(strings.documentAgent.analysisFailed);
    }

    if (!geminiResult.ok) {
        const isQuotaError = geminiResult.status === 429;
        const message = isQuotaError ? strings.errors.quotaExceeded : strings.documentAgent.analysisFailed;
        captureError(new Error(message), { filename, status: geminiResult.status });
        throw new Error(message);
    }

    const responseText = extractGeminiText(geminiResult.data);

    if (responseText === null) {
        return retryExtraction(prompt, '', filename);
    }

    try {
        return parseExtractionJson(responseText);
    } catch (error: unknown) {
        captureError(error instanceof Error ? error : new Error(strings.documentAgent.analysisFailed), { filename });
        return retryExtraction(prompt, responseText, filename);
    }
}

/** Single retry with a "fix your JSON" follow-up */
async function retryExtraction(
    originalPrompt: string,
    badResponse: string,
    filename: string,
): Promise<ExtractionResult> {
    let retryResult;
    try {
        retryResult = await callGemini(buildRetryBody(originalPrompt, badResponse));
    } catch (error: unknown) {
        captureError(error instanceof Error ? error : new Error(strings.documentAgent.analysisFailed), { filename });
        throw new Error(strings.documentAgent.analysisFailed);
    }

    if (!retryResult.ok) {
        captureError(new Error(strings.documentAgent.analysisFailed), { filename, status: retryResult.status });
        throw new Error(strings.documentAgent.analysisFailed);
    }

    const retryText = extractGeminiText(retryResult.data);
    if (retryText === null) {
        captureError(new Error(strings.documentAgent.analysisFailed), { filename });
        throw new Error(strings.documentAgent.analysisFailed);
    }

    try {
        return parseExtractionJson(retryText);
    } catch (error: unknown) {
        captureError(error instanceof Error ? error : new Error(strings.documentAgent.analysisFailed), { filename });
        throw error instanceof Error ? error : new Error(strings.documentAgent.analysisFailed);
    }
}
