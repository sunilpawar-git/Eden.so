/**
 * Link Preview Fallback - Client-side fetch for development / no-proxy environments
 * Strategy: Try direct fetch first (works for CORS-friendly sites),
 * then return basic metadata with Google's favicon service.
 */
import type { LinkPreviewMetadata } from '../types/node';
import { extractDomain } from './linkPreviewService';

/** Fetch timeout in milliseconds */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Fetch link preview using multiple fallback strategies.
 * 1. Try direct fetch (works if CORS allows)
 * 2. Return basic metadata with favicon from Google's service
 */
export async function fetchLinkPreviewDirect(
    url: string,
    signal?: AbortSignal,
): Promise<LinkPreviewMetadata> {
    // Strategy 1: Direct fetch (works for CORS-friendly sites)
    const directResult = await tryDirectFetch(url, signal);
    if (directResult && !directResult.error) return directResult;

    // Strategy 2: Basic metadata with favicon (always works)
    return basicMetadata(url);
}

/** Try fetching HTML directly and parsing meta tags */
async function tryDirectFetch(
    url: string,
    signal?: AbortSignal,
): Promise<LinkPreviewMetadata | null> {
    try {
        const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
        const combinedSignal = signal
            ? AbortSignal.any([signal, timeoutSignal])
            : timeoutSignal;

        const response = await fetch(url, {
            signal: combinedSignal,
            mode: 'cors',
        });
        if (!response.ok) return null;

        const html = await response.text();
        return parseMetaTags(html, url);
    } catch {
        return null;
    }
}

/**
 * Parse HTML string and extract OG / Twitter Card meta tags.
 * Falls back to <title> tag when no OG/Twitter title is found.
 */
export function parseMetaTags(html: string, url: string): LinkPreviewMetadata {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const og = (prop: string) => metaContent(doc, `meta[property="og:${prop}"]`);
    const tw = (name: string) => metaContent(doc, `meta[name="twitter:${name}"]`);

    const title = og('title') ?? tw('title')
        ?? doc.querySelector('title')?.textContent ?? undefined;
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

/** Read content attribute from a meta selector, or undefined */
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
    return buildFaviconUrl(pageUrl);
}

/** Build favicon URL using Google's public favicon service */
function buildFaviconUrl(pageUrl: string): string {
    const domain = extractDomain(pageUrl);
    if (!domain) return '';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

/** Build basic metadata with favicon (no fetch required) */
function basicMetadata(url: string): LinkPreviewMetadata {
    const domain = extractDomain(url);
    return {
        url,
        domain,
        title: domain,
        favicon: buildFaviconUrl(url),
        fetchedAt: Date.now(),
    };
}
