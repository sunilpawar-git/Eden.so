/**
 * PWA String Resources Tests
 * TDD: Verifies all pwa.* string keys exist and are non-empty
 */
import { describe, it, expect } from 'vitest';
import { strings } from '../strings';

describe('strings.pwa', () => {
    it('should have pwa section defined', () => {
        expect(strings.pwa).toBeDefined();
    });

    it('should have updateAvailable string', () => {
        expect(strings.pwa.updateAvailable).toBeTruthy();
        expect(typeof strings.pwa.updateAvailable).toBe('string');
    });

    it('should have updateNow string', () => {
        expect(strings.pwa.updateNow).toBeTruthy();
        expect(typeof strings.pwa.updateNow).toBe('string');
    });

    it('should have dismissUpdate string', () => {
        expect(strings.pwa.dismissUpdate).toBeTruthy();
        expect(typeof strings.pwa.dismissUpdate).toBe('string');
    });

    it('should have appName string', () => {
        expect(strings.pwa.appName).toBeTruthy();
        expect(typeof strings.pwa.appName).toBe('string');
    });

    it('should have appShortName string', () => {
        expect(strings.pwa.appShortName).toBeTruthy();
        expect(typeof strings.pwa.appShortName).toBe('string');
    });

    it('should have appDescription string', () => {
        expect(strings.pwa.appDescription).toBeTruthy();
        expect(typeof strings.pwa.appDescription).toBe('string');
    });

    it('should have no empty string values', () => {
        const pwaEntries = Object.entries(strings.pwa);
        for (const [key, value] of pwaEntries) {
            expect(value, `strings.pwa.${key} should not be empty`).toBeTruthy();
        }
    });
});
