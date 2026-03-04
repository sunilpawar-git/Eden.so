/**
 * Storage Path Utilities — SSOT for converting Firebase Storage download URLs to storage paths.
 * Used by documentUploadService (delete) and attachmentTextCache (read).
 */

/**
 * Extract a Firebase Storage path from a download URL.
 * Download URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?...
 * Returns null for malformed or non-Firebase URLs (safe: never throws).
 */
export function storagePathFromDownloadUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const match = /\/o\/(.+?)(\?|$)/.exec(urlObj.pathname);
        if (!match?.[1]) return null;
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
}
