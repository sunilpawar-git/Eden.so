/**
 * Parser Types — Contracts for the file parser infrastructure
 * SSOT for all parser-related interfaces
 * Follows Interface Segregation: small, focused contracts
 */

/** Result of parsing a file — returned by every FileParser implementation */
export interface ParseResult {
    /** Display title derived from file (e.g. filename without extension) */
    title: string;
    /** Extracted text content (sanitized) */
    content: string;
    /** MIME type of the original file */
    mimeType: string;
    /** Original file name */
    originalFileName: string;
    /** Sub-chunks for large documents (e.g. multi-page PDFs) */
    chunks?: ParseResult[];
    /** Binary blob for files requiring Storage upload (e.g. compressed images) */
    blob?: Blob;
    /** Parser-specific metadata (e.g. requiresUpload, pageCount) */
    metadata?: Record<string, string | boolean>;
}

/** Contract that every file parser must implement (Open/Closed principle) */
export interface FileParser {
    /** MIME types this parser can handle */
    readonly supportedMimeTypes: readonly string[];
    /** File extensions this parser can handle (with leading dot) */
    readonly supportedExtensions: readonly string[];
    /** Check if this parser can handle a given file */
    canParse(file: File): boolean;
    /** Parse the file and return structured result */
    parse(file: File): Promise<ParseResult>;
}

/** Typed error for parser failures */
export class ParserError extends Error {
    constructor(
        message: string,
        public readonly code: 'UNSUPPORTED_TYPE' | 'PARSE_FAILED' | 'PDF_SCANNED'
    ) {
        super(message);
        this.name = 'ParserError';
    }
}
