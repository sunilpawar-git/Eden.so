/**
 * TextFileParser — Handles .txt, .md, .json files
 * Implements FileParser interface (Open/Closed principle)
 */
import type { FileParser, ParseResult } from './types';
import { sanitizeContent } from '../utils/sanitizer';
import { readFileAsText } from './fileReaderUtil';
import { titleFromFilename } from './parserUtils';

const SUPPORTED_MIME_TYPES = ['text/plain', 'text/markdown', 'application/json'] as const;
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json'] as const;

export class TextFileParser implements FileParser {
    readonly supportedMimeTypes = SUPPORTED_MIME_TYPES;
    readonly supportedExtensions = SUPPORTED_EXTENSIONS;

    canParse(file: File): boolean {
        if (SUPPORTED_MIME_TYPES.some((t) => t === file.type)) return true;
        const name = file.name.toLowerCase();
        return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
    }

    async parse(file: File): Promise<ParseResult> {
        const rawText = await readFileAsText(file);
        const content = sanitizeContent(rawText);

        return {
            title: titleFromFilename(file.name),
            content,
            mimeType: file.type,
            originalFileName: file.name,
        };
    }
}
