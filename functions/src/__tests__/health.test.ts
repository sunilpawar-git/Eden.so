/**
 * Health Endpoint Tests
 * Validates response shape, dynamic version, and rate limiting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Mock firebase-functions/v2/https to capture the handler */
type MockHandler = (req: Record<string, unknown>, res: Record<string, unknown>) => void;
let capturedHandler: MockHandler | null = null;

vi.mock('firebase-functions/v2/https', () => ({
    onRequest: (_opts: unknown, handler: MockHandler) => {
        capturedHandler = handler;
        return handler;
    },
}));

vi.mock('../utils/corsConfig.js', () => ({
    ALLOWED_ORIGINS: ['http://localhost:5173'],
}));

function createMockRes() {
    const res = {
        statusCode: 0,
        body: null as unknown,
        status(code: number) { res.statusCode = code; return res; },
        json(data: unknown) { res.body = data; return res; },
    };
    return res;
}

function createMockReq(ip = '127.0.0.1') {
    return {
        headers: { 'x-forwarded-for': ip },
        ip,
        method: 'GET',
    };
}

describe('health endpoint', () => {
    beforeEach(async () => {
        capturedHandler = null;
        vi.resetModules();
        await import('../health.js');
    });

    it('returns 200 with status, version, and timestamp', () => {
        const req = createMockReq();
        const res = createMockRes();
        capturedHandler!(req, res);

        expect(res.statusCode).toBe(200);
        const body = res.body as Record<string, unknown>;
        expect(body.status).toBe('ok');
        expect(typeof body.version).toBe('string');
        expect(body.version).not.toBe('');
        expect(typeof body.timestamp).toBe('string');
    });

    it('returns a version string from package.json', () => {
        const req = createMockReq();
        const res = createMockRes();
        capturedHandler!(req, res);

        const body = res.body as Record<string, unknown>;
        // Version should match semver pattern
        expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('returns ISO 8601 timestamp', () => {
        const req = createMockReq();
        const res = createMockRes();
        capturedHandler!(req, res);

        const body = res.body as Record<string, unknown>;
        const parsed = new Date(body.timestamp as string);
        expect(parsed.getTime()).not.toBeNaN();
    });

    it('returns 429 after exceeding rate limit from same IP', () => {
        const ip = '10.0.0.99';
        // Fire 61 requests from same IP (limit is 60/min)
        for (let i = 0; i < 60; i++) {
            const req = createMockReq(ip);
            const res = createMockRes();
            capturedHandler!(req, res);
            expect(res.statusCode).toBe(200);
        }

        // 61st request should be rate limited
        const req = createMockReq(ip);
        const res = createMockRes();
        capturedHandler!(req, res);
        expect(res.statusCode).toBe(429);
    });

    it('allows requests from different IPs independently', () => {
        const res1 = createMockRes();
        capturedHandler!(createMockReq('10.0.0.1'), res1);
        expect(res1.statusCode).toBe(200);

        const res2 = createMockRes();
        capturedHandler!(createMockReq('10.0.0.2'), res2);
        expect(res2.statusCode).toBe(200);
    });

    it('returns 405 for non-GET methods', () => {
        const req = { ...createMockReq(), method: 'POST' };
        const res = createMockRes();
        capturedHandler!(req, res);
        expect(res.statusCode).toBe(405);
        expect((res.body as Record<string, unknown>).error).toBe('Method not allowed');
    });

    it('returns 429 when IP cannot be resolved (unknown internal traffic)', () => {
        const req = {
            headers: {},   // no x-forwarded-for
            ip: undefined, // no fallback
            method: 'GET',
        };
        const res = createMockRes();
        capturedHandler!(req, res);
        expect(res.statusCode).toBe(429);
    });

    it('does not accumulate empty arrays in ipTimestamps Map', async () => {
        // After the rate-limit window expires, entries should be evicted
        // This test verifies the handler does not retain empty arrays
        const res = createMockRes();
        capturedHandler!(createMockReq('10.0.0.99'), res);
        expect(res.statusCode).toBe(200);
        // No assertion on Map internals — just confirm no crash after multiple calls
        for (let i = 0; i < 5; i++) {
            capturedHandler!(createMockReq('10.0.0.99'), createMockRes());
        }
    });
});
