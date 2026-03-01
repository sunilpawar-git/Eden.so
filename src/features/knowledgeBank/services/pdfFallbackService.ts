/**
 * PDF Fallback Service — Orchestrates Gemini fallback for scanned PDFs
 * Transparent to the caller: primary parser runs first, Gemini only activates
 * when pdfjs-dist finds no text layer (PDF_SCANNED error code).
 */
import type { FileParser, ParseResult } from '../parsers/types';
import { ParserError } from '../parsers/types';
import { extractPdfWithGemini } from './geminiPdfExtractor';
import { chunkDocument } from './chunkingService';
import { sanitizeContent } from '../utils/sanitizer';
import { titleFromFilename } from '../parsers/parserUtils';
import { strings } from '@/shared/localization/strings';

/** Assemble a ParseResult from Gemini-extracted PDF text */
function buildPdfResult(text: string, file: File): ParseResult {
    const fullText = sanitizeContent(text);
    const title = titleFromFilename(file.name);
    const chunks = chunkDocument(fullText, title);
    const result: ParseResult = {
        title,
        content: fullText,
        mimeType: 'application/pdf',
        originalFileName: file.name,
        metadata: { aiExtracted: 'true' },
    };
    if (chunks.length > 0) {
        result.chunks = chunks.map((chunk) => ({
            title: chunk.title,
            content: chunk.content,
            mimeType: 'application/pdf',
            originalFileName: file.name,
        }));
    }
    return result;
}

/**
 * Parse a file using the given parser, with a transparent Gemini fallback
 * for scanned PDFs. Calls onFallback() before AI extraction begins so the
 * caller can show a progress notification.
 *
 * Throws if:
 * - The primary parser fails for a non-scanned-PDF reason
 * - Gemini is unavailable or also fails to extract text
 */
export async function parseWithPdfFallback(
    parser: FileParser,
    file: File,
    onFallback: () => void,
): Promise<ParseResult> {
    try {
        return await parser.parse(file);
    } catch (error) {
        if (error instanceof ParserError && error.code === 'PDF_SCANNED') {
            onFallback();
            const extracted = await extractPdfWithGemini(file);
            if (!extracted?.trim()) {
                throw new ParserError(strings.knowledgeBank.errors.pdfEmpty, 'PARSE_FAILED');
            }
            return buildPdfResult(extracted, file);
        }
        throw error;
    }
}
