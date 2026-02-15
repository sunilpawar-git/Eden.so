/**
 * ParserRegistry — Central registry for file parsers
 * Resolves the correct parser for a given file by MIME type
 * New parsers register themselves here (Open/Closed principle)
 */
import type { FileParser } from './types';
import { TextFileParser } from './textFileParser';
import { ImageFileParser } from './imageFileParser';
import { PdfFileParser } from './pdfFileParser';
import { DocxFileParser } from './docxFileParser';

export class ParserRegistry {
    private parsers: FileParser[] = [];

    /** Register a parser implementation */
    register(parser: FileParser): void {
        this.parsers.push(parser);
    }

    /** Find the first parser that can handle this file, or null */
    getParser(file: File): FileParser | null {
        return this.parsers.find((p) => p.canParse(file)) ?? null;
    }

    /** All supported file extensions (deduplicated) */
    getSupportedExtensions(): string[] {
        const all = this.parsers.flatMap((p) => [...p.supportedExtensions]);
        return [...new Set(all)];
    }

    /** All supported MIME types (deduplicated) */
    getSupportedMimeTypes(): string[] {
        const all = this.parsers.flatMap((p) => [...p.supportedMimeTypes]);
        return [...new Set(all)];
    }
}

// ── Singleton with built-in parsers ────────────────────

/** Pre-configured registry with all built-in parsers */
export const kbParserRegistry = new ParserRegistry();
kbParserRegistry.register(new TextFileParser());
kbParserRegistry.register(new ImageFileParser());
kbParserRegistry.register(new PdfFileParser());
kbParserRegistry.register(new DocxFileParser());
