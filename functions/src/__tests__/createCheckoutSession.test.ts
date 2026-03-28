/**
 * createCheckoutSession Cloud Function Tests
 * Validates security layers and Stripe session creation.
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
vi.mock('../utils/threatMonitor.js', () => ({ recordThreatEvent: vi.fn() }));

const mockSessionCreate = vi.fn();
vi.mock('../utils/stripeClient.js', () => ({
    stripeSecretKey: { value: () => 'sk_test' },
    getStripeClient: () => ({ checkout: { sessions: { create: mockSessionCreate } } }),
}));

vi.mock('../utils/securityConstants.js', async (orig) => {
    const actual = await orig<Record<string, unknown>>();
    return {
        ...actual,
        CHECKOUT_RATE_LIMIT: { windowMs: 60_000, max: 5 },
        IP_RATE_LIMIT_CHECKOUT: { windowMs: 60_000, max: 10 },
    };
});

// Valid price ID matching the env fallback used in the function
process.env.STRIPE_PRICE_PRO_MONTHLY_INR = 'price_pro_monthly_inr';

function createMockRes() {
    const res: Record<string, unknown> = {
        statusCode: 0,
        body: null as unknown,
    };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: unknown) => { res.body = data; return res; };
    return res;
}

function createMockReq(overrides: Record<string, unknown> = {}) {
    return {
        method: 'POST',
        ip: '1.2.3.4',
        headers: { authorization: 'Bearer valid-token', 'x-forwarded-for': '1.2.3.4' },
        body: { priceId: 'price_pro_monthly_inr' },
        ...overrides,
    };
}

describe('createCheckoutSession', () => {
    beforeEach(async () => {
        capturedHandler = null;
        vi.resetModules();
        mockVerifyAuthToken.mockResolvedValue('user-1');
        mockDetectBot.mockReturnValue({ isBot: false, confidence: 'none' });
        mockCheckIpRateLimit.mockResolvedValue(true);
        mockCheckRateLimit.mockResolvedValue(true);
        mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/test' });
        await import('../createCheckoutSession.js');
    });

    it('returns 405 for non-POST methods', async () => {
        const req = createMockReq({ method: 'GET' });
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(405);
    });

    it('returns 403 when bot detected with high confidence', async () => {
        mockDetectBot.mockReturnValue({ isBot: true, confidence: 'high', reason: 'UA' });
        const req = createMockReq();
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(403);
    });

    it('allows low-confidence bot through', async () => {
        mockDetectBot.mockReturnValue({ isBot: true, confidence: 'low' });
        const req = createMockReq();
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(200);
    });

    it('returns 429 when IP rate limit exceeded', async () => {
        mockCheckIpRateLimit.mockResolvedValue(false);
        const req = createMockReq();
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(429);
    });

    it('returns 401 when auth token missing or invalid', async () => {
        mockVerifyAuthToken.mockResolvedValue(null);
        const req = createMockReq();
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(401);
    });

    it('returns 429 when user rate limit exceeded', async () => {
        mockCheckRateLimit.mockResolvedValue(false);
        const req = createMockReq();
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(429);
    });

    it('returns 400 for invalid priceId', async () => {
        const req = createMockReq({ body: { priceId: 'price_evil' } });
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(400);
    });

    it('returns 400 for missing priceId', async () => {
        const req = createMockReq({ body: {} });
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(400);
    });

    it('returns 200 with checkoutUrl on success', async () => {
        const req = createMockReq();
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(200);
        expect((res.body as Record<string, unknown>).checkoutUrl).toBe(
            'https://checkout.stripe.com/pay/test',
        );
    });

    it('returns 500 when Stripe returns null session.url', async () => {
        mockSessionCreate.mockResolvedValue({ url: null });
        const req = createMockReq();
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(500);
    });

    it('returns 500 when Stripe throws', async () => {
        mockSessionCreate.mockRejectedValue(new Error('Stripe error'));
        const req = createMockReq();
        const res = createMockRes();
        await capturedHandler!(req, res);
        expect(res.statusCode).toBe(500);
    });

    it('does NOT accept successUrl or cancelUrl from request body', async () => {
        const req = createMockReq({
            body: {
                priceId: 'price_pro_monthly_inr',
                successUrl: 'https://evil.com',
                cancelUrl: 'https://evil.com',
            },
        });
        const res = createMockRes();
        await capturedHandler!(req, res);
        // Should succeed (extra fields ignored) and not call stripe with evil URLs
        const callArgs = mockSessionCreate.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(callArgs.success_url).not.toContain('evil.com');
        expect(callArgs.cancel_url).not.toContain('evil.com');
    });
});
