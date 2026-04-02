/**
 * health Cloud Function — lightweight liveness probe
 * Returns JSON with status, version, and server timestamp.
 * No auth required — safe for uptime monitoring services.
 *
 * Rate limited to 60 req/min per IP to prevent DDoS amplification.
 * Version is read from package.json at module load time.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { ALLOWED_ORIGINS } from './utils/corsConfig.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/** Simple in-memory sliding-window rate limiter for the health endpoint */
const ipTimestamps = new Map<string, number[]>();
const HEALTH_RATE_LIMIT = 60;
const HEALTH_WINDOW_MS = 60_000;

function checkIpRate(ip: string): boolean {
    const now = Date.now();
    const cutoff = now - HEALTH_WINDOW_MS;
    const timestamps = (ipTimestamps.get(ip) ?? []).filter(ts => ts > cutoff);

    if (timestamps.length >= HEALTH_RATE_LIMIT) {
        ipTimestamps.set(ip, timestamps);
        return false;
    }

    timestamps.push(now);
    // Evict entry when empty to prevent unbounded Map growth on long-running instances
    if (timestamps.length > 0) {
        ipTimestamps.set(ip, timestamps);
    } else {
        ipTimestamps.delete(ip);
    }
    return true;
}

/** Read version from package.json at module load time */
function loadVersion(): string {
    try {
        const dir = dirname(fileURLToPath(import.meta.url));
        const pkgPath = join(dir, '..', 'package.json');
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
        return pkg.version ?? '0.0.0';
    } catch {
        return '0.0.0';
    }
}

const APP_VERSION = loadVersion();

export const health = onRequest({ cors: ALLOWED_ORIGINS }, (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip) ?? '';

    // Reject requests with no resolvable IP — treat as unknown/internal traffic
    if (!rawIp) {
        res.status(429).json({ error: 'Too many requests' });
        return;
    }

    if (!checkIpRate(rawIp)) {
        res.status(429).json({ error: 'Too many requests' });
        return;
    }

    res.status(200).json({
        status: 'ok',
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
    });
});
