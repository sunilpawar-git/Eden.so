/**
 * Rate Limiter - In-memory sliding window rate limiter per user
 * Prevents abuse of Cloud Function endpoints
 */
import { RATE_LIMIT_WINDOW_MS } from './securityConstants.js';

/** Tracks request timestamps per user ID */
interface RateLimitEntry {
    timestamps: number[];
}

/** In-memory store keyed by "userId:endpoint" */
const store = new Map<string, RateLimitEntry>();

/**
 * Check if a request is within the rate limit and record it.
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(
    userId: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number = RATE_LIMIT_WINDOW_MS,
): boolean {
    const key = `${userId}:${endpoint}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = store.get(key);
    if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

    if (entry.timestamps.length >= maxRequests) {
        return false;
    }

    entry.timestamps.push(now);
    return true;
}

/** Clear all rate limit state (for testing) */
export function clearRateLimitStore(): void {
    store.clear();
}

/** Get current request count for a user/endpoint (for testing) */
export function getRequestCount(userId: string, endpoint: string): number {
    const key = `${userId}:${endpoint}`;
    const entry = store.get(key);
    if (!entry) return 0;
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    return entry.timestamps.filter((ts) => ts > cutoff).length;
}
