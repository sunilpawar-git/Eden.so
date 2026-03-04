/**
 * Document Insert Service — Orchestrates document attachment into nodes
 * Pure functions (no React hooks). Coordinates parsing, upload, and state updates.
 *
 * Flow:
 *   1. Validate file (size, MIME, magic bytes)
 *   2. Parse document (extract text + thumbnail)
 *   3. Upload artifacts to Firebase Storage
 *   4. Return AttachmentMeta for the caller to persist into node data
 */
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import { parseDocument } from './documentParsingService';
import {
    validateDocumentFile,
    dataUrlToBlob,
} from './documentUploadService';
import type { DocumentUploadResult } from './documentUploadService';
import type { AttachmentMeta, DocumentMimeType } from '../types/document';

/** Function signature for the upload step (injectable for testing) */
export type DocumentUploadFn = (
    file: File,
    parsedText: string,
    thumbnailBlob?: Blob,
) => Promise<DocumentUploadResult>;

/** Result of a successful document insertion — meta for display + raw text for agent */
export interface DocumentInsertResult {
    meta: AttachmentMeta;
    parsedText: string;
}

/** Known localized error messages that should be shown as-is */
const KNOWN_DOC_ERRORS = new Set([
    strings.canvas.docFileTooLarge,
    strings.canvas.docUnsupportedType,
    strings.canvas.docMagicByteMismatch,
    strings.canvas.docReadFailed,
    strings.canvas.docParsingFailed,
]);

/** Extract a user-facing message from a document processing error */
export function getDocumentErrorMessage(error: unknown): string {
    if (error instanceof Error && KNOWN_DOC_ERRORS.has(error.message)) {
        return error.message;
    }
    return strings.canvas.docUploadFailed;
}

/**
 * Full document insertion pipeline:
 *   validate → parse → upload → return DocumentInsertResult
 *
 * @param file - The user-selected document file
 * @param uploadFn - Uploads artifacts and returns URLs
 * @returns DocumentInsertResult with meta + parsedText, or null on failure
 */
export async function processDocumentForNode(
    file: File,
    uploadFn: DocumentUploadFn,
): Promise<DocumentInsertResult | null> {
    try {
        await validateDocumentFile(file);
        const parseResult = await parseDocument(file);

        let thumbnailBlob: Blob | undefined;
        if (parseResult.thumbnailDataUrl) {
            thumbnailBlob = dataUrlToBlob(parseResult.thumbnailDataUrl);
        }

        const uploadResult = await uploadFn(file, parseResult.text, thumbnailBlob);

        const meta: AttachmentMeta = {
            filename: file.name,
            url: uploadResult.documentUrl,
            thumbnailUrl: uploadResult.thumbnailUrl,
            parsedTextUrl: uploadResult.parsedTextUrl,
            mimeType: file.type as DocumentMimeType,
            sizeBytes: file.size,
        };

        return { meta, parsedText: parseResult.text };
    } catch (error: unknown) {
        toast.error(getDocumentErrorMessage(error));
        return null;
    }
}
