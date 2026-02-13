/**
 * Meta Parser - Server-side Open Graph / Twitter Card metadata extraction
 * Uses node-html-parser for fast, secure HTML parsing without DOM
 */
import { parse as parseHtml } from 'node-html-parser';

/** Parsed link preview metadata returned to the client */
export interface ParsedMetadata {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    domain?: string;
    cardType?: 'summary' | 'summary_large_image' | 'player' | 'app';
    fetchedAt: number;
}

/**
 * Extract hostname from a URL string.
 * Returns empty string for invalid URLs.
 */
export function extractDomain(url: string): string {
    try { return new URL(url).hostname; }
    catch { return ''; }
}

/**
 * Parse HTML and extract Open Graph / Twitter Card meta tags.
 * Falls back to <title> when no OG/Twitter title is found.
 */
export function parseMetaTags(html: string, url: string): ParsedMetadata {
    const root = parseHtml(html);

    const og = (prop: string): string | undefined =>
        metaContent(root, `meta[property="og:${prop}"]`);

    const tw = (name: string): string | undefined =>
        metaContent(root, `meta[name="twitter:${name}"]`);

    const titleTag = root.querySelector('title');
    const title = og('title') ?? tw('title') ?? titleTag?.textContent ?? undefined;
    const description = og('description') ?? tw('description') ?? undefined;
    const image = og('image') ?? tw('image') ?? undefined;
    const rawCardType = tw('card');
    const cardType = isValidCardType(rawCardType) ? rawCardType : undefined;
    const favicon = resolveFavicon(root, url);

    return {
        url, title, description, image, favicon, cardType,
        domain: extractDomain(url),
        fetchedAt: Date.now(),
    };
}

/** Valid Twitter card types */
const VALID_CARD_TYPES = ['summary', 'summary_large_image', 'player', 'app'] as const;
type CardType = (typeof VALID_CARD_TYPES)[number];

function isValidCardType(value: string | undefined): value is CardType {
    return !!value && (VALID_CARD_TYPES as readonly string[]).includes(value);
}

/** Read content attribute from the first matching meta element */
function metaContent(
    root: ReturnType<typeof parseHtml>,
    selector: string,
): string | undefined {
    return root.querySelector(selector)?.getAttribute('content') ?? undefined;
}

/** Resolve favicon URL — prefer link[rel="icon"], fallback to /favicon.ico */
function resolveFavicon(
    root: ReturnType<typeof parseHtml>,
    pageUrl: string,
): string {
    const iconLink = root.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    const href = iconLink?.getAttribute('href');
    if (href) {
        try { return new URL(href, pageUrl).href; }
        catch { /* fall through */ }
    }
    try { return new URL('/favicon.ico', pageUrl).href; }
    catch { return ''; }
}
