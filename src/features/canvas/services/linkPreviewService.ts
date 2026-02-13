/**
 * Link Preview Service - Fetches link metadata securely
 * Uses Cloud Function proxy when configured (production),
 * falls back to direct client-side fetch (development)
 * Pure async service — no React dependencies, no store coupling
 */
import type { LinkPreviewMetadata } from '../types/node';
import { getAuthToken } from '@/features/auth/services/authTokenService';
import { getFetchLinkMetaUrl, isProxyConfigured } from '@/config/linkPreviewConfig';
import { fetchLinkPreviewDirect } from './linkPreviewFallback';

/** Fetch timeout in milliseconds */
const FETCH_TIMEOUT_MS = 10_000;

/** Service interface for dependency inversion (SOLID: D) */
export interface LinkPreviewService {
    fetchLinkPreview: (url: string, signal?: AbortSignal) => Promise<LinkPreviewMetadata>;
    extractDomain: (url: string) => string;
}

/** Dependencies that can be injected for testing */
export interface LinkPreviewDeps {
    getToken: () => Promise<string | null>;
    getEndpointUrl: () => string;
    checkConfigured: () => boolean;
    directFetch: (url: string, signal?: AbortSignal) => Promise<LinkPreviewMetadata>;
}

/** Default production dependencies */
const defaultDeps: LinkPreviewDeps = {
    getToken: getAuthToken,
    getEndpointUrl: getFetchLinkMetaUrl,
    checkConfigured: isProxyConfigured,
    directFetch: fetchLinkPreviewDirect,
};

/**
 * Extract hostname from a URL string.
 * Returns empty string for invalid URLs.
 */
export function extractDomain(url: string): string {
    try { return new URL(url).hostname; }
    catch { return ''; }
}

/**
 * Fetch link preview metadata.
 * Strategy: proxy (Cloud Function) when configured, direct fetch otherwise.
 * Accepts optional deps for testing (DI pattern).
 */
export async function fetchLinkPreview(
    url: string,
    signal?: AbortSignal,
    deps: LinkPreviewDeps = defaultDeps,
): Promise<LinkPreviewMetadata> {
    // If proxy is not configured, use direct client-side fetch (dev mode)
    if (!deps.checkConfigured()) {
        return deps.directFetch(url, signal);
    }

    // Proxy path: require auth token
    try {
        const token = await deps.getToken();
        if (!token) return await deps.directFetch(url, signal);

        const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
        const combinedSignal = signal
            ? AbortSignal.any([signal, timeoutSignal])
            : timeoutSignal;

        const response = await fetch(deps.getEndpointUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ url }),
            signal: combinedSignal,
        });

        if (!response.ok) return await deps.directFetch(url, signal);

        const data = await response.json() as Partial<LinkPreviewMetadata>;
        const result: LinkPreviewMetadata = {
            ...data,
            url,
            domain: data.domain ?? extractDomain(url),
            fetchedAt: data.fetchedAt ?? Date.now(),
        };

        // If proxy returned error metadata, try direct fallback
        if (result.error) return await deps.directFetch(url, signal);

        return result;
    } catch {
        // Proxy failed (network, timeout) — try direct fallback
        return await deps.directFetch(url, signal);
    }
}

/** Exported service object following project DI pattern */
export const linkPreviewService: LinkPreviewService = {
    fetchLinkPreview,
    extractDomain,
};
