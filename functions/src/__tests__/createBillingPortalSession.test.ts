/**
 * createBillingPortalSession Cloud Function Tests
 * Validates security layers and open redirect prevention.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockHandler = (req: Record<string, unknown>, res: Record<string, unknown>) => Promise<void>;
let capturedHandler: MockHandler | null = null;

vi.mock('firebase-functions/v2/https', () => ({
    onRequest: (_opts: unknown, handler: MockHandler) => {
        capturedHandler = handler;
        return handler;
    },
}));

vi.mock('../utils/corsConfig.js', () => ({ ALLOWED_ORIGINS: ['http://localhost'] }));

const mockVerifyAuthToken = vi.fn();
vi.mock('../utils/authVerifier.js', () => ({ verifyAuthToken: mockVerifyAuthToken }));

const mockDetectBot = vi.fn();
vi.mock('../utils/botDetector.js', () => ({
    detectBot: mockDetectBot,
    extractClientIp: () => '1.2.3.4',
}));

const mockCheckIpRateLimit = vi.fn();
vi.mock('../utils/ipRateLimiter.js', () => ({ checkIpRateLimit: mockCheckIpRateLimit }));

const mockCheckRateLimit = vi.fn();
vi.mock('../utils/rateLimiter.js', () => ({ checkRateLimit: mockCheckRateLimit }));

vi.mock('../utils/securityLogger.js', () => ({
    logSecurityEvent: vi.fn(),
    SecurityEventType: new Proxy({}, { get: (_t, p) => String(p) }),
}));
const mockRecordThreatEvent = vi.fn();
vi.mock('../utils/threatMonitor.js', () => ({ recordThreatEvent: mockRecordThreatEvent }));

const mockPortalCreate = vi.fn();
vi.mock('../utils/stripeClient.js', () => ({
    stripeSecretKey: { value: () => 'sk_test' },
    getStripeClient: () => ({ billingPortal: { sessions: { create: mockPortalCreate } } }),
}));

vi.mock('../utils/securityConstants.js', async (orig) => {
    const actual = await orig<Record<string, unknown>>();
    return {
        ...actual,
        BILLING_PORTAL_RATE_LIMIT: { windowMs: 60_000, max: 10 },
        IP_RATE_LIMIT_BILLING_PORTAL: { windowMs: 60_000, max: 20 },
    };
});

const mockSubGet = vi.fn();
vi.mock('firebase-admin/firestore', () => ({
    getFirestore: () => ({
        doc: () => ({ get: mockSubGet }),
    }),
}));

function createMockRes() {
    const res: Record<string, unknown> = { statusCode: 0, body: null as unknown };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: unknown) => { res.body = data; return res; };
    return res;
}

function createMockReq(overrides: Record<string, unknown> = {}) {
    return {
        method: 'POST',
        ip: '1.2.3.4',
        headers: { authorization: 'Bearer valid-token', 'x-forwarded-for': '1.2.3.4' },
        body: {},
        ...overrides,
    };
}

describe('createBillingPortalSession', () => {
    beforeEach(async () => {
        capturedHandler = null;
        vi.resetModules();
        mockVerifyAuthToken.mockResolvedValue('user-1');
        mockDetectBot.mockReturnValue({ isBot: false, confidence: 'none' });
        mockCheckIpRateLimit.mockResolvedValue(true);
        mockCheckRateLimit.mockResolvedValue(true);
        mockSubGet.mockResolvedValue({ data: () => ({ gatewayCustomerId: 'cus_abc' }) });
        mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session/test' });
        mockRecordThreatEvent.mockReset();
        await import('../createBillingPortalSession.js');
    });

    it('returns 405 for non-POST methods', async () => {
        const res = createMockRes();
        await capturedHandler!(createMockReq({ method: 'GET' }), res);
        expect(res.statusCode).toBe(405);
    });

    it('returns 403 when bot detected', async () => {
        mockDetectBot.mockReturnValue({ isBot: true, confidence: 'high', reason: 'UA' });
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(res.statusCode).toBe(403);
    });

    it('returns 429 when IP rate limit exceeded', async () => {
        mockCheckIpRateLimit.mockResolvedValue(false);
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(res.statusCode).toBe(429);
    });

    it('calls recordThreatEvent on IP rate limit exceeded', async () => {
        mockCheckIpRateLimit.mockResolvedValue(false);
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(mockRecordThreatEvent).toHaveBeenCalledWith('429_spike', expect.any(Object));
    });

    it('returns 401 when auth fails', async () => {
        mockVerifyAuthToken.mockResolvedValue(null);
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(res.statusCode).toBe(401);
    });

    it('calls recordThreatEvent on auth failure', async () => {
        mockVerifyAuthToken.mockResolvedValue(null);
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(mockRecordThreatEvent).toHaveBeenCalledWith('auth_failure_spike', expect.any(Object));
    });

    it('returns 429 when user rate limit exceeded', async () => {
        mockCheckRateLimit.mockResolvedValue(false);
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(res.statusCode).toBe(429);
    });

    it('calls recordThreatEvent on user rate limit exceeded', async () => {
        mockCheckRateLimit.mockResolvedValue(false);
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(mockRecordThreatEvent).toHaveBeenCalledWith('429_spike', expect.any(Object));
    });

    it('returns 404 when no Stripe customer found', async () => {
        mockSubGet.mockResolvedValue({ data: () => ({}) });
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(res.statusCode).toBe(404);
    });

    it('returns 200 with portalUrl on success', async () => {
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(res.statusCode).toBe(200);
        expect((res.body as Record<string, unknown>).portalUrl).toBe(
            'https://billing.stripe.com/session/test',
        );
    });

    it('returns 500 when Stripe throws', async () => {
        mockPortalCreate.mockRejectedValue(new Error('Stripe error'));
        const res = createMockRes();
        await capturedHandler!(createMockReq(), res);
        expect(res.statusCode).toBe(500);
    });

    it('ignores returnUrl from request body (open redirect prevention)', async () => {
        const req = createMockReq({ body: { returnUrl: 'https://evil.com' } });
        const res = createMockRes();
        await capturedHandler!(req, res);
        const callArgs = mockPortalCreate.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(callArgs.return_url).not.toContain('evil.com');
        expect(callArgs.return_url).toContain('actionstation.in');
    });
});
