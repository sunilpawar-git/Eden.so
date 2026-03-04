/**
 * Analyze Command Service — handles /analyze slash command logic.
 * Fetches parsedText from existing attachments, checks cache, triggers analysis.
 */
import { attachmentTextCache } from '@/features/ai/services/attachmentTextCache';
import { strings } from '@/shared/localization/strings';
import { getCachedExtraction } from './extractionCacheService';
import type { AttachmentMeta } from '@/features/canvas/types/document';

export interface AnalyzeCommandResult {
    parsedText: string;
    filename: string;
    isCached: boolean;
}

/**
 * Resolve the first analyzable attachment from a node's attachments.
 * Returns null if no attachment has parsedTextUrl.
 */
export function findAnalyzableAttachment(
    attachments: AttachmentMeta[] | undefined,
): AttachmentMeta | null {
    if (!attachments || attachments.length === 0) return null;
    return attachments.find((a) => Boolean(a.parsedTextUrl)) ?? null;
}

/**
 * Check if an attachment has a fresh cached extraction.
 * Returns the cached result or null.
 */
export function checkExtractionCache(attachment: AttachmentMeta): boolean {
    return getCachedExtraction(attachment) !== null;
}

/**
 * Fetch parsed text for an attachment via the shared cache.
 * Returns empty string on failure (fail-open).
 */
export async function fetchParsedText(attachment: AttachmentMeta): Promise<string> {
    if (!attachment.parsedTextUrl) return '';
    return attachmentTextCache.getText(attachment.parsedTextUrl);
}

/**
 * Resolve analyze command — find attachment, check cache, fetch text.
 * Returns null with a reason string if analysis cannot proceed.
 */
export async function resolveAnalyzeCommand(
    attachments: AttachmentMeta[] | undefined,
): Promise<{ result: AnalyzeCommandResult } | { error: string }> {
    const attachment = findAnalyzableAttachment(attachments);
    if (!attachment) {
        return { error: strings.documentAgent.noAttachment };
    }

    const isCached = checkExtractionCache(attachment);
    const parsedText = await fetchParsedText(attachment);

    if (!parsedText) {
        return { error: strings.documentAgent.analysisFailed };
    }

    return {
        result: {
            parsedText,
            filename: attachment.filename,
            isCached,
        },
    };
}
