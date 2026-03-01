/**
 * Gemini PDF Extractor — AI-powered text extraction for scanned/image-based PDFs
 * Sends the PDF as inline base64 data to Gemini's multimodal API.
 * Mirrors imageDescriptionService: systemInstruction carries the prompt,
 * inlineData carries the document content.
 */
import { callGemini, isGeminiAvailable, extractGeminiText } from './geminiClient';
import { blobToBase64 } from './imageDescriptionService';
import { KB_MAX_FILE_SIZE, KB_PDF_EXTRACTION_MAX_TOKENS } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';

const GEMINI_PDF_CONFIG = {
    temperature: 0.1,      // Near-deterministic — faithful extraction, not creativity
    maxOutputTokens: KB_PDF_EXTRACTION_MAX_TOKENS,
} as const;

/**
 * Extract text from a scanned/image-based PDF using Gemini's native PDF understanding.
 * Returns null if Gemini is unavailable, file is oversized, base64 encoding fails,
 * or extraction fails — never throws.
 */
export async function extractPdfWithGemini(file: File): Promise<string | null> {
    if (!isGeminiAvailable() || file.size > KB_MAX_FILE_SIZE) return null;

    try {
        const base64Data = await blobToBase64(file);
        if (!base64Data) return null;

        const result = await callGemini({
            contents: [{
                parts: [
                    { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                ],
            }],
            generationConfig: GEMINI_PDF_CONFIG,
            systemInstruction: {
                parts: [{ text: strings.knowledgeBank.pdfExtractionPrompt }],
            },
        });

        if (!result.ok) return null;
        return extractGeminiText(result.data);
    } catch {
        return null;
    }
}
