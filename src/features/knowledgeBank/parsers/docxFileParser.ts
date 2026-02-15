/**
 * DocxFileParser — Handles .docx files via mammoth
 * Extracts raw text, auto-chunks large documents
 * Uses dynamic import to avoid loading mammoth at module level
 * Implements FileParser interface (Open/Closed principle)
 */
import type { FileParser, ParseResult } from './types';
import { ParserError } from './types';
import { readFileAsArrayBuffer } from './fileReaderUtil';
import { chunkDocument } from '../services/chunkingService';
import { sanitizeContent } from '../utils/sanitizer';
import { strings } from '@/shared/localization/strings';
import { titleFromFilename } from './parserUtils';

const DOCX_MIME =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SUPPORTED_MIME_TYPES = [DOCX_MIME] as const;
const SUPPORTED_EXTENSIONS = ['.docx'] as const;

export class DocxFileParser implements FileParser {
    readonly supportedMimeTypes = SUPPORTED_MIME_TYPES;
    readonly supportedExtensions = SUPPORTED_EXTENSIONS;

    canParse(file: File): boolean {
        if (file.type === DOCX_MIME) return true;
        return file.name.toLowerCase().endsWith('.docx');
    }

    async parse(file: File): Promise<ParseResult> {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const rawText = await extractTextFromDocx(arrayBuffer);
        const fullText = sanitizeContent(rawText);

        if (!fullText.trim()) {
            throw new ParserError(
                strings.knowledgeBank.errors.docxEmpty,
                'PARSE_FAILED'
            );
        }

        const title = titleFromFilename(file.name);
        const chunks = chunkDocument(fullText, title);

        const result: ParseResult = {
            title,
            content: fullText,
            mimeType: DOCX_MIME,
            originalFileName: file.name,
        };

        if (chunks.length > 0) {
            result.chunks = chunks.map((chunk) => ({
                title: chunk.title,
                content: chunk.content,
                mimeType: DOCX_MIME,
                originalFileName: file.name,
            }));
        }

        return result;
    }
}

/** Extract raw text from a DOCX file (dynamic import to avoid jsdom issues) */
async function extractTextFromDocx(data: ArrayBuffer): Promise<string> {
    try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ arrayBuffer: data });
        return result.value;
    } catch (error) {
        if (error instanceof ParserError) throw error;
        throw new ParserError(
            strings.knowledgeBank.errors.docxParseFailed,
            'PARSE_FAILED'
        );
    }
}
