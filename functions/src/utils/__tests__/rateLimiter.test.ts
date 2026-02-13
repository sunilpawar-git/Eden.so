/**
 * Rate Limiter Tests
 * TDD: Validates per-user rate limiting, window expiration, and isolation
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, clearRateLimitStore, getRequestCount } from '../rateLimiter.js';

describe('rateLimiter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        clearRateLimitStore();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('allows requests under the limit', () => {
        const allowed = checkRateLimit('user-1', 'test', 5, 60_000);
        expect(allowed).toBe(true);
    });

    it('tracks request count correctly', () => {
        checkRateLimit('user-1', 'test', 10, 60_000);
        checkRateLimit('user-1', 'test', 10, 60_000);
        checkRateLimit('user-1', 'test', 10, 60_000);
        expect(getRequestCount('user-1', 'test')).toBe(3);
    });

    it('blocks requests at the limit', () => {
        for (let i = 0; i < 3; i++) {
            expect(checkRateLimit('user-1', 'test', 3, 60_000)).toBe(true);
        }
        // 4th request should be blocked
        expect(checkRateLimit('user-1', 'test', 3, 60_000)).toBe(false);
    });

    it('isolates different users', () => {
        for (let i = 0; i < 3; i++) {
            checkRateLimit('user-1', 'test', 3, 60_000);
        }
        // user-1 is at limit, but user-2 should be fine
        expect(checkRateLimit('user-1', 'test', 3, 60_000)).toBe(false);
        expect(checkRateLimit('user-2', 'test', 3, 60_000)).toBe(true);
    });

    it('isolates different endpoints for same user', () => {
        for (let i = 0; i < 3; i++) {
            checkRateLimit('user-1', 'meta', 3, 60_000);
        }
        expect(checkRateLimit('user-1', 'meta', 3, 60_000)).toBe(false);
        expect(checkRateLimit('user-1', 'image', 3, 60_000)).toBe(true);
    });

    it('resets after the time window expires', () => {
        for (let i = 0; i < 3; i++) {
            checkRateLimit('user-1', 'test', 3, 60_000);
        }
        expect(checkRateLimit('user-1', 'test', 3, 60_000)).toBe(false);

        // Advance time past the window
        vi.advanceTimersByTime(61_000);

        // Should be allowed again
        expect(checkRateLimit('user-1', 'test', 3, 60_000)).toBe(true);
    });
});
