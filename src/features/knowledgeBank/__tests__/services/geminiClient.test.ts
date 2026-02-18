/**
 * Gemini Client Tests — SSOT routing, proxy fallback, response extraction
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub auth token service
vi.mock('@/features/auth/services/authTokenService', () => ({
    getAuthToken: vi.fn().mockResolvedValue('mock-token'),
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import {
    callGemini,
    isProxyConfigured,
    isGeminiAvailable,
    extractGeminiText,
} from '../../services/geminiClient';
// eslint-disable-next-line import-x/first
import type { GeminiRequestBody, GeminiResponse } from '../../services/geminiClient';

const TEST_BODY: GeminiRequestBody = {
    contents: [{ parts: [{ text: 'Hello' }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
};

function geminiJsonResponse(text: string): GeminiResponse {
    return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe('geminiClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
        vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', '');
        vi.stubEnv('VITE_GEMINI_API_KEY', '');
    });

    // ── isProxyConfigured / isGeminiAvailable ───────────────

    describe('isProxyConfigured', () => {
        it('returns false when VITE_CLOUD_FUNCTIONS_URL is empty', () => {
            expect(isProxyConfigured()).toBe(false);
        });

        it('returns true when VITE_CLOUD_FUNCTIONS_URL is set', () => {
            vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'https://fn.example.com');
            expect(isProxyConfigured()).toBe(true);
        });
    });

    describe('isGeminiAvailable', () => {
        it('returns false when neither proxy nor key is set', () => {
            expect(isGeminiAvailable()).toBe(false);
        });

        it('returns true when only direct key is set', () => {
            vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
            expect(isGeminiAvailable()).toBe(true);
        });

        it('returns true when only proxy is set', () => {
            vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'https://fn.example.com');
            expect(isGeminiAvailable()).toBe(true);
        });
    });

    // ── callGemini routing ──────────────────────────────────

    describe('callGemini routing', () => {
        it('returns { ok: false } when no endpoint is configured', async () => {
            const result = await callGemini(TEST_BODY);
            expect(result).toEqual({ ok: false, status: 0, data: null });
            expect(fetch).not.toHaveBeenCalled();
        });

        it('calls direct API when only API key is set', async () => {
            vi.stubEnv('VITE_GEMINI_API_KEY', 'direct-key');
            const mockResponse = geminiJsonResponse('Direct result');
            vi.mocked(fetch).mockResolvedValue({
                ok: true, status: 200,
                json: () => Promise.resolve(mockResponse),
            } as Response);

            const result = await callGemini(TEST_BODY);
            expect(result.ok).toBe(true);
            expect(result.data).toEqual(mockResponse);

            const url = vi.mocked(fetch).mock.calls[0]![0] as string;
            expect(url).toContain('generativelanguage.googleapis.com');
            expect(url).toContain('key=direct-key');
        });

        it('calls proxy when VITE_CLOUD_FUNCTIONS_URL is set', async () => {
            vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'https://fn.example.com');
            const mockResponse = geminiJsonResponse('Proxy result');
            vi.mocked(fetch).mockResolvedValue({
                ok: true, status: 200,
                json: () => Promise.resolve(mockResponse),
            } as Response);

            const result = await callGemini(TEST_BODY);
            expect(result.ok).toBe(true);

            const url = vi.mocked(fetch).mock.calls[0]![0] as string;
            expect(url).toBe('https://fn.example.com/geminiProxy');
        });

        it('includes Authorization header when calling proxy', async () => {
            vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'https://fn.example.com');
            vi.mocked(fetch).mockResolvedValue({
                ok: true, status: 200,
                json: () => Promise.resolve(geminiJsonResponse('ok')),
            } as Response);

            await callGemini(TEST_BODY);

            const opts = vi.mocked(fetch).mock.calls[0]![1] as RequestInit;
            const headers = opts.headers as Record<string, string>;
            expect(headers.Authorization).toBe('Bearer mock-token');
        });
    });

    // ── Proxy fallback to direct ────────────────────────────

    describe('proxy fallback to direct on network error', () => {
        it('falls back to direct key when proxy fetch throws', async () => {
            vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'http://localhost:5001/project/us-central1');
            vi.stubEnv('VITE_GEMINI_API_KEY', 'fallback-key');

            const directResponse = geminiJsonResponse('Fallback result');

            // First call (proxy) throws network error, second call (direct) succeeds
            vi.mocked(fetch)
                .mockRejectedValueOnce(new TypeError('Failed to fetch'))
                .mockResolvedValueOnce({
                    ok: true, status: 200,
                    json: () => Promise.resolve(directResponse),
                } as Response);

            const result = await callGemini(TEST_BODY);

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result.ok).toBe(true);
            expect(result.data).toEqual(directResponse);

            // Second call should be to the direct API
            const directUrl = vi.mocked(fetch).mock.calls[1]![0] as string;
            expect(directUrl).toContain('generativelanguage.googleapis.com');
            expect(directUrl).toContain('key=fallback-key');
        });

        it('returns failure when proxy throws and no direct key exists', async () => {
            vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'http://localhost:5001/project/us-central1');
            // No VITE_GEMINI_API_KEY set

            vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

            const result = await callGemini(TEST_BODY);

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ ok: false, status: 0, data: null });
        });

        it('does NOT fall back on HTTP errors (only network errors)', async () => {
            vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'https://fn.example.com');
            vi.stubEnv('VITE_GEMINI_API_KEY', 'fallback-key');

            // Proxy returns 500 (HTTP error, not network error)
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false, status: 500,
                json: () => Promise.resolve({ error: { message: 'Internal', code: 500 } }),
            } as Response);

            const result = await callGemini(TEST_BODY);

            // Should NOT fall back — HTTP errors are valid responses
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(result.ok).toBe(false);
            expect(result.status).toBe(500);
        });
    });

    // ── systemInstruction serialization ────────────────────

    describe('systemInstruction serialization', () => {
        const bodyWithSystem: GeminiRequestBody = {
            contents: [{ parts: [{ text: 'User prompt' }] }],
            generationConfig: { temperature: 0.7 },
            systemInstruction: { parts: [{ text: 'You are a helpful assistant.' }] },
        };

        it('serializes systemInstruction as system_instruction (snake_case) in direct path', async () => {
            vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
            vi.mocked(fetch).mockResolvedValue({
                ok: true, status: 200,
                json: () => Promise.resolve(geminiJsonResponse('ok')),
            } as Response);

            await callGemini(bodyWithSystem);

            const fetchBody = JSON.parse(
                vi.mocked(fetch).mock.calls[0]![1]!.body as string
            ) as Record<string, unknown>;
            expect(fetchBody).toHaveProperty('system_instruction');
            expect(fetchBody).not.toHaveProperty('systemInstruction');
            expect(fetchBody.system_instruction).toEqual({
                parts: [{ text: 'You are a helpful assistant.' }],
            });
        });

        it('serializes systemInstruction as system_instruction (snake_case) in proxy path', async () => {
            vi.stubEnv('VITE_CLOUD_FUNCTIONS_URL', 'https://fn.example.com');
            vi.mocked(fetch).mockResolvedValue({
                ok: true, status: 200,
                json: () => Promise.resolve(geminiJsonResponse('ok')),
            } as Response);

            await callGemini(bodyWithSystem);

            const fetchBody = JSON.parse(
                vi.mocked(fetch).mock.calls[0]![1]!.body as string
            ) as Record<string, unknown>;
            expect(fetchBody).toHaveProperty('system_instruction');
            expect(fetchBody).not.toHaveProperty('systemInstruction');
        });

        it('omits system_instruction when systemInstruction is not provided', async () => {
            vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
            vi.mocked(fetch).mockResolvedValue({
                ok: true, status: 200,
                json: () => Promise.resolve(geminiJsonResponse('ok')),
            } as Response);

            await callGemini(TEST_BODY);

            const fetchBody = JSON.parse(
                vi.mocked(fetch).mock.calls[0]![1]!.body as string
            ) as Record<string, unknown>;
            expect(fetchBody).not.toHaveProperty('system_instruction');
            expect(fetchBody).not.toHaveProperty('systemInstruction');
        });
    });

    // ── extractGeminiText ───────────────────────────────────

    describe('extractGeminiText', () => {
        it('extracts text from a valid response', () => {
            const data = geminiJsonResponse('Hello world');
            expect(extractGeminiText(data)).toBe('Hello world');
        });

        it('returns null for null data', () => {
            expect(extractGeminiText(null)).toBeNull();
        });

        it('returns null for empty candidates', () => {
            expect(extractGeminiText({ candidates: [] })).toBeNull();
        });

        it('returns null for whitespace-only text', () => {
            const data = geminiJsonResponse('   ');
            expect(extractGeminiText(data)).toBeNull();
        });

        it('trims whitespace from result', () => {
            const data = geminiJsonResponse('  trimmed  ');
            expect(extractGeminiText(data)).toBe('trimmed');
        });
    });
});
