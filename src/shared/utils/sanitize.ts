/**
 * Shared sanitization utilities
 * SSOT for filename and input sanitization across all features
 */

/**
 * Sanitize a filename to prevent path traversal and special character exploits.
 * Strips directory separators, "..", and non-printable characters.
 */
export function sanitizeFilename(raw: string): string {
    const stripped = raw.replace(/[/\\]/g, '_').replace(/\.\./g, '_');
    // eslint-disable-next-line no-control-regex
    const cleaned = stripped.replace(/[\x00-\x1F\x7F]/g, '');
    return cleaned || 'unnamed';
}
