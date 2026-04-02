/**
 * Production Domain Configuration — SSOT
 * All production-facing domains that need CORS and CSP access.
 *
 * Update this file when adding or changing production domains.
 * Structural tests enforce that firebase.json CSP and corsConfig.ts
 * stay in sync with these values.
 */

/** Firebase default hosting domains (auto-provisioned) */
export const FIREBASE_DOMAINS = [
    'https://actionstation-244f0.web.app',
    'https://actionstation-244f0.firebaseapp.com',
] as const;

/** Custom production domains (DNS-configured) */
export const CUSTOM_DOMAINS = [
    'https://www.actionstation.in',
] as const;

/** All production domains — consumed by CORS config and structural tests */
export const PRODUCTION_DOMAINS: readonly string[] = [
    ...FIREBASE_DOMAINS,
    ...CUSTOM_DOMAINS,
];

/** Localhost origins — safe for CORS (attackers cannot host on visitor's localhost) */
export const LOCALHOST_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
] as const;
