/**
 * fetchLinkMeta Cloud Function - Securely fetches and parses link preview metadata
 * Validates URL, checks auth, enforces rate limits, prevents SSRF
 */
import { onRequest } from 'firebase-functions/v2/https';
import { verifyAuthToken } from './utils/authVerifier.js';
import { validateUrlWithDns } from './utils/urlValidator.js';
import { parseMetaTags, extractDomain } from './utils/metaParser.js';
import { checkRateLimit } from './utils/rateLimiter.js';
import {
    errorMessages,
    META_RATE_LIMIT,
    FETCH_TIMEOUT_MS,
    MAX_HTML_SIZE_BYTES,
} from './utils/securityConstants.js';

/** Request body shape for fetchLinkMeta */
interface FetchLinkMetaRequest {
    url?: string;
}

/**
 * Core handler logic extracted for testability.
 * Accepts parsed request data and returns the response payload.
 */
export async function handleFetchLinkMeta(
    body: FetchLinkMetaRequest,
    uid: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
    const { url } = body;

    if (!url || typeof url !== 'string') {
        return { status: 400, data: { error: errorMessages.invalidUrl } };
    }

    // Rate limit check
    if (!checkRateLimit(uid, 'fetchLinkMeta', META_RATE_LIMIT)) {
        return { status: 429, data: { error: errorMessages.rateLimited } };
    }

    // URL validation with SSRF protection
    const validation = await validateUrlWithDns(url);
    if (!validation.valid) {
        return { status: 400, data: { error: validation.error } };
    }

    // Fetch the page HTML server-side
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'EdenLinkPreviewBot/1.0',
                'Accept': 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return { status: 200, data: buildErrorMetadata(url) };
        }

        // Enforce response size limit
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_HTML_SIZE_BYTES) {
            return { status: 200, data: buildErrorMetadata(url) };
        }

        const html = await response.text();
        if (html.length > MAX_HTML_SIZE_BYTES) {
            return { status: 200, data: buildErrorMetadata(url) };
        }

        const metadata = parseMetaTags(html, url);
        return { status: 200, data: { ...metadata } };
    } catch {
        return { status: 200, data: buildErrorMetadata(url) };
    }
}

/** Build error metadata for a URL that could not be fetched */
function buildErrorMetadata(url: string): Record<string, unknown> {
    return {
        url,
        domain: extractDomain(url),
        fetchedAt: Date.now(),
        error: true,
    };
}

/**
 * Cloud Function entry point.
 * POST /fetchLinkMeta { url: string }
 * Requires Firebase Auth token in Authorization header.
 */
export const fetchLinkMeta = onRequest(
    { cors: true, maxInstances: 10 },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: errorMessages.methodNotAllowed });
            return;
        }

        const uid = await verifyAuthToken(req.headers.authorization);
        if (!uid) {
            res.status(401).json({ error: errorMessages.authRequired });
            return;
        }

        const result = await handleFetchLinkMeta(
            req.body as FetchLinkMetaRequest,
            uid,
        );
        res.status(result.status).json(result.data);
    },
);
