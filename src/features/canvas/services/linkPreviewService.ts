/**
 * Link Preview Service - Fetches and parses Open Graph / Twitter Card metadata
 * Pure async service — no React dependencies, no store coupling
 */
import type { LinkPreviewMetadata } from '../types/node';

/** Fetch timeout in milliseconds */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Extract hostname from a URL string
 * Returns empty string for invalid URLs
 */
export function extractDomain(url: string): string {
    try { return new URL(url).hostname; }
    catch { return ''; }
}

/**
 * Fetch a URL and parse its OG/Twitter Card meta tags into LinkPreviewMetadata.
 * Returns partial metadata (url + domain + error) on failure.
 */
export async function fetchLinkPreview(
    url: string,
    signal?: AbortSignal,
): Promise<LinkPreviewMetadata> {
    try {
        const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
        const combinedSignal = signal
            ? AbortSignal.any([signal, timeoutSignal])
            : timeoutSignal;

        const response = await fetch(url, { signal: combinedSignal });
        if (!response.ok) return errorMetadata(url);

        const html = await response.text();
        return parseMetaTags(html, url);
    } catch {
        return errorMetadata(url);
    }
}

/** Build minimal error metadata for a failed fetch */
function errorMetadata(url: string): LinkPreviewMetadata {
    return { url, domain: extractDomain(url), fetchedAt: Date.now(), error: true };
}

/**
 * Parse HTML string and extract OG / Twitter Card meta tags.
 * Falls back to <title> tag when no OG/Twitter title is found.
 */
export function parseMetaTags(html: string, url: string): LinkPreviewMetadata {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const og = (prop: string) => metaContent(doc, `meta[property="og:${prop}"]`);
    const tw = (name: string) => metaContent(doc, `meta[name="twitter:${name}"]`);

    const title = og('title') ?? tw('title') ?? doc.querySelector('title')?.textContent ?? undefined;
    const description = og('description') ?? tw('description') ?? undefined;
    const image = og('image') ?? tw('image') ?? undefined;
    const cardType = tw('card') as LinkPreviewMetadata['cardType'] ?? undefined;
    const favicon = resolveFavicon(doc, url);

    return {
        url, title, description, image, favicon, cardType,
        domain: extractDomain(url),
        fetchedAt: Date.now(),
    };
}

/** Read content attribute from a meta selector, or null */
function metaContent(doc: Document, selector: string): string | undefined {
    return doc.querySelector(selector)?.getAttribute('content') ?? undefined;
}

/** Resolve favicon URL — prefer link[rel="icon"], fallback to /favicon.ico */
function resolveFavicon(doc: Document, pageUrl: string): string {
    const iconLink = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    const href = iconLink?.getAttribute('href');
    if (href) {
        try { return new URL(href, pageUrl).href; }
        catch { /* fall through */ }
    }
    try { return new URL('/favicon.ico', pageUrl).href; }
    catch { return ''; }
}
