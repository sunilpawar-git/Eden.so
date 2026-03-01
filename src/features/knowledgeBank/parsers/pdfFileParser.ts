/**
 * PdfFileParser — Handles .pdf files via pdfjs-dist
 * Extracts text page-by-page, auto-chunks large documents
 * Uses dynamic import to avoid loading pdfjs-dist at module level
 * Implements FileParser interface (Open/Closed principle)
 */
import type { FileParser, ParseResult } from './types';
import { ParserError } from './types';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { readFileAsArrayBuffer } from './fileReaderUtil';
import { chunkDocument } from '../services/chunkingService';
import { sanitizeContent } from '../utils/sanitizer';
import { strings } from '@/shared/localization/strings';
import { titleFromFilename } from './parserUtils';

const SUPPORTED_MIME_TYPES = ['application/pdf'] as const;
const SUPPORTED_EXTENSIONS = ['.pdf'] as const;

export class PdfFileParser implements FileParser {
    readonly supportedMimeTypes = SUPPORTED_MIME_TYPES;
    readonly supportedExtensions = SUPPORTED_EXTENSIONS;

    canParse(file: File): boolean {
        if (file.type === 'application/pdf') return true;
        return file.name.toLowerCase().endsWith('.pdf');
    }

    async parse(file: File): Promise<ParseResult> {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const pageTexts = await extractTextFromPdf(arrayBuffer);
        const fullText = sanitizeContent(pageTexts.join('\n\n'));

        if (!fullText.trim()) {
            throw new ParserError(
                strings.knowledgeBank.errors.pdfEmpty,
                'PARSE_FAILED'
            );
        }

        const title = titleFromFilename(file.name);
        const chunks = chunkDocument(fullText, title);

        const result: ParseResult = {
            title,
            content: fullText,
            mimeType: 'application/pdf',
            originalFileName: file.name,
            metadata: { pageCount: String(pageTexts.length) },
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
}

/** Extract text from each page of a PDF (dynamic import to avoid jsdom issues) */
async function extractTextFromPdf(data: ArrayBuffer): Promise<string[]> {
    try {
        const pdfjsLib = await import('pdfjs-dist');

        // Use locally-bundled worker (Vite ?url import) — no CDN dependency
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const pageTexts: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => ('str' in item ? item.str : ''))
                .join(' ');
            pageTexts.push(pageText);
        }

        return pageTexts;
    } catch (error) {
        if (error instanceof ParserError) throw error;
        throw new ParserError(
            strings.knowledgeBank.errors.pdfParseFailed,
            'PARSE_FAILED'
        );
    }
}
