/**
 * CORS Origin Configuration — SSOT for all Cloud Function CORS settings
 * Firebase Functions v2 accepts cors as string[] of allowed origins.
 *
 * Production domains are imported from domainConfig.ts (single source of truth).
 * Localhost origins are always included: CORS only restricts browsers, and
 * attackers cannot host malicious pages on a visitor's own localhost.
 */
import { PRODUCTION_DOMAINS, LOCALHOST_ORIGINS } from './domainConfig.js';

const envOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((o) => o.trim()).filter(Boolean) ?? [];

const ALLOWED_ORIGINS: string[] = [
    ...PRODUCTION_DOMAINS,
    ...LOCALHOST_ORIGINS,
    ...envOrigins,
];

export { ALLOWED_ORIGINS };
