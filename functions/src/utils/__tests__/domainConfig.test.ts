/**
 * Domain Config Tests — SSOT validation
 * Ensures production domain arrays are well-formed and consistent.
 */
import { describe, it, expect } from 'vitest';
import {
    FIREBASE_DOMAINS,
    CUSTOM_DOMAINS,
    PRODUCTION_DOMAINS,
    LOCALHOST_ORIGINS,
} from '../domainConfig.js';

describe('domainConfig', () => {
    describe('PRODUCTION_DOMAINS', () => {
        it('includes all Firebase hosting domains', () => {
            for (const domain of FIREBASE_DOMAINS) {
                expect(PRODUCTION_DOMAINS).toContain(domain);
            }
        });

        it('includes all custom domains', () => {
            for (const domain of CUSTOM_DOMAINS) {
                expect(PRODUCTION_DOMAINS).toContain(domain);
            }
        });

        it('has no duplicate entries', () => {
            const unique = new Set(PRODUCTION_DOMAINS);
            expect(unique.size).toBe(PRODUCTION_DOMAINS.length);
        });

        it('all entries start with https://', () => {
            for (const domain of PRODUCTION_DOMAINS) {
                expect(domain).toMatch(/^https:\/\//);
            }
        });

        it('no entries contain trailing slashes', () => {
            for (const domain of PRODUCTION_DOMAINS) {
                expect(domain).not.toMatch(/\/$/);
            }
        });

        it('no entries contain wildcards', () => {
            for (const domain of PRODUCTION_DOMAINS) {
                expect(domain).not.toContain('*');
            }
        });

        it('equals the union of FIREBASE_DOMAINS and CUSTOM_DOMAINS', () => {
            const expected = [...FIREBASE_DOMAINS, ...CUSTOM_DOMAINS];
            expect(PRODUCTION_DOMAINS).toEqual(expected);
        });
    });

    describe('LOCALHOST_ORIGINS', () => {
        it('all entries start with http://localhost', () => {
            for (const origin of LOCALHOST_ORIGINS) {
                expect(origin).toMatch(/^http:\/\/localhost/);
            }
        });

        it('includes Vite dev server port', () => {
            expect(LOCALHOST_ORIGINS).toContain('http://localhost:5173');
        });

        it('includes Vite preview port', () => {
            expect(LOCALHOST_ORIGINS).toContain('http://localhost:4173');
        });
    });
});
