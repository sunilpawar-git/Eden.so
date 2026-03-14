/**
 * fetchArticleHtml Handler Tests
 * TDD: Validates request handling, auth, rate limiting, SSRF, and HTML proxy behaviour
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleFetchArticleHtml } from '../fetchArticleHtml.js';
import { clearRateLimitStore } from '../utils/rateLimiter.js';
import * as urlValidator from '../utils/urlValidator.js';

vi.mock('firebase-admin/auth', () => ({
    getAuth: () => ({
        verifyIdToken: vi.fn().mockImplementation((token: string) => {
            if (token === 'valid-token') {
                return Promise.resolve({ uid: 'test-uid' });
            }
            return Promise.reject(new Error('Invalid token'));
        }),
    }),
}));

const SAMPLE_HTML = '<html><head><title>Test Article</title></head><body><p>Hello world</p></body></html>';
const originalFetch = globalThis.fetch;

describe('handleFetchArticleHtml', () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        await clearRateLimitStore();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('returns 400 when url is missing', async () => {
        const result = await handleFetchArticleHtml({}, 'uid-1');
        expect(result.status).toBe(400);
        expect(result.data.error).toBeDefined();
    });

    it('returns 400 when url is not a string', async () => {
        const result = await handleFetchArticleHtml({ url: 123 as unknown as string }, 'uid-1');
        expect(result.status).toBe(400);
    });

    it('returns 400 for invalid/private URL (SSRF protection)', async () => {
        vi.spyOn(urlValidator, 'validateUrlWithDns').mockResolvedValueOnce({
            valid: false,
            error: 'URL target is not allowed',
        });
        const result = await handleFetchArticleHtml({ url: 'https://169.254.169.254' }, 'uid-1');
        expect(result.status).toBe(400);
        expect(result.data.error).toContain('not allowed');
    });

    it('returns html on successful fetch', async () => {
        vi.spyOn(urlValidator, 'validateUrlWithDns').mockResolvedValueOnce({ valid: true });
        globalThis.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            headers: { get: () => null },
            body: null,
            text: () => Promise.resolve(SAMPLE_HTML),
        } as unknown as Response);

        const result = await handleFetchArticleHtml({ url: 'https://example.com/article' }, 'uid-1');
        expect(result.status).toBe(200);
        expect(result.data.html).toBe(SAMPLE_HTML);
        expect(result.data.url).toBe('https://example.com/article');
    });

    it('returns error when upstream returns non-ok response', async () => {
        vi.spyOn(urlValidator, 'validateUrlWithDns').mockResolvedValueOnce({ valid: true });
        globalThis.fetch = vi.fn().mockResolvedValueOnce({
            ok: false,
            status: 404,
            headers: { get: () => null },
        } as unknown as Response);

        const result = await handleFetchArticleHtml({ url: 'https://example.com/notfound' }, 'uid-1');
        expect(result.status).toBe(200);
        expect(result.data.error).toBeDefined();
    });

    it('returns error when response body exceeds size limit', async () => {
        vi.spyOn(urlValidator, 'validateUrlWithDns').mockResolvedValueOnce({ valid: true });
        const largeContentLength = String(2 * 1024 * 1024); // 2 MB > 1 MB limit
        globalThis.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            headers: { get: (h: string) => h === 'content-length' ? largeContentLength : null },
            body: null,
        } as unknown as Response);

        const result = await handleFetchArticleHtml({ url: 'https://example.com/huge' }, 'uid-1');
        expect(result.status).toBe(200);
        expect(result.data.error).toBeDefined();
    });

    it('returns 429 when rate limit is exceeded', async () => {
        vi.spyOn(urlValidator, 'validateUrlWithDns').mockResolvedValue({ valid: true });
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => null },
            body: null,
            text: () => Promise.resolve(SAMPLE_HTML),
        } as unknown as Response);

        // Exhaust the ARTICLE_RATE_LIMIT (10 per minute)
        for (let i = 0; i < 10; i++) {
            await handleFetchArticleHtml({ url: 'https://example.com/article' }, 'uid-rate-test');
        }
        const result = await handleFetchArticleHtml({ url: 'https://example.com/article' }, 'uid-rate-test');
        expect(result.status).toBe(429);
    });
});
