/**
 * Image Proxy URL Builder - Constructs proxied image URLs
 * In production: Routes external images through Cloud Function proxy for privacy.
 * In development: Returns original URLs directly (emulator has ORB issues).
 */
import { getProxyImageUrl, isProxyConfigured } from '@/config/linkPreviewConfig';

/** Check if running in dev mode (read at call time for testability) */
function isDev(): boolean {
    return import.meta.env.DEV;
}

/** Only allow http: and https: schemes for image URLs */
function isSafeScheme(url: string): boolean {
    try {
        const scheme = new URL(url).protocol;
        return scheme === 'http:' || scheme === 'https:';
    } catch {
        return false;
    }
}

/**
 * Build a proxied image URL for secure rendering.
 * - Production: proxied URL with auth token query param
 * - Development: original URL with scheme validation
 * Returns empty string for empty/undefined/unsafe input.
 */
export function buildProxiedImageUrl(
    rawUrl: string | undefined,
    token?: string | null,
): string {
    if (!rawUrl) return '';
    if (!isSafeScheme(rawUrl)) return '';
    if (isDev() || !isProxyConfigured()) return rawUrl;
    return getProxyImageUrl(rawUrl, token ?? undefined);
}
