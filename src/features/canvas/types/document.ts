/**
 * Document Types — Constants and types for node document attachments
 * SSOT for document-related constraints across canvas feature
 *
 * MVP scope: PDF, plain text, CSV only.
 * DOCX/XLSX deferred to a follow-up feature.
 */
import { strings } from '@/shared/localization/strings';

/** Allowed document MIME types for node attachments (MVP) */
export const DOCUMENT_ACCEPTED_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'text/csv',
] as const;

export type DocumentMimeType = (typeof DOCUMENT_ACCEPTED_MIME_TYPES)[number];

/** Max document file size in bytes (15 MB) */
export const DOCUMENT_MAX_FILE_SIZE = 15 * 1024 * 1024;

/**
 * Magic byte signatures for client-side file header validation.
 * Prevents MIME-spoofing attacks (e.g., polyglot files).
 *
 * We only validate PDF since text/csv and text/plain have no
 * universal magic bytes — they are validated by MIME + content heuristics.
 */
export const MAGIC_BYTE_SIGNATURES: ReadonlyMap<string, Uint8Array> = new Map([
    ['application/pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46])], // %PDF
]);

/** Number of header bytes to read for magic-byte validation */
export const MAGIC_BYTE_READ_LENGTH = 4;

/** Human-readable file type labels keyed by MIME type */
export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentMimeType, string>> = {
    'application/pdf': 'PDF',
    'text/plain': 'Text',
    'text/csv': 'CSV',
};

/** File extensions keyed by MIME type (used for display & sanitization) */
export const DOCUMENT_EXTENSIONS: Readonly<Record<DocumentMimeType, string>> = {
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'text/csv': '.csv',
};

/** Check whether a MIME type is in the allowed document list */
export function isAcceptedDocumentType(mimeType: string): boolean {
    return (DOCUMENT_ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Read the first N bytes of a File to obtain its magic bytes.
 * Returns a Uint8Array of header bytes for comparison.
 */
export function readFileMagicBytes(file: File, length = MAGIC_BYTE_READ_LENGTH): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(new Uint8Array(reader.result as ArrayBuffer));
        };
        reader.onerror = () => reject(new Error(strings.canvas.docReadHeaderFailed));
        reader.readAsArrayBuffer(file.slice(0, length));
    });
}

/**
 * Validate that a file's magic bytes match its declared MIME type.
 * Returns true if validation passes or if the MIME type has no
 * registered magic byte signature (text/plain, text/csv).
 */
export async function validateMagicBytes(file: File): Promise<boolean> {
    const expected = MAGIC_BYTE_SIGNATURES.get(file.type);
    if (!expected) return true; // No signature to validate

    const actual = await readFileMagicBytes(file, expected.length);
    if (actual.length < expected.length) return false;

    for (let i = 0; i < expected.length; i++) {
        if (actual[i] !== expected[i]) return false;
    }
    return true;
}

/**
 * Metadata stored in IdeaNodeData.attachments for each attached document.
 * Lightweight — no raw text, only references to Storage URLs.
 */
export interface AttachmentMeta {
    /** Original filename (sanitized) */
    filename: string;
    /** Firebase Storage download URL for the raw document */
    url: string;
    /** Firebase Storage download URL for the thumbnail image (PDF first page) */
    thumbnailUrl?: string;
    /** Firebase Storage download URL for the extracted plain-text file */
    parsedTextUrl?: string;
    /** MIME type of the original document */
    mimeType: DocumentMimeType;
    /** File size in bytes */
    sizeBytes: number;
}
