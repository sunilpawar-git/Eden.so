/**
 * AttachmentCardView utilities — pure functions extracted to allow fast-refresh
 * on the AttachmentCardView component (React fast-refresh requires component-only files).
 */
import { DOCUMENT_TYPE_LABELS } from '../../types/document';

const SAFE_URL_SCHEMES = /^https?:\/\//i;

/** Validates URL has a safe scheme (http/https only) */
export function isSafeUrl(url: string): boolean {
    return SAFE_URL_SCHEMES.test(url);
}

/** Derive a display label from MIME type, falling back to the uppercased file extension */
export function getIconLabel(mimeType: string, filename: string): string {
    const label = DOCUMENT_TYPE_LABELS[mimeType as keyof typeof DOCUMENT_TYPE_LABELS];
    if (label) return label;
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext && ext.length > 0 ? ext : '?';
}
