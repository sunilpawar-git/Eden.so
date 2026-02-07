/**
 * Conflict Detector Tests
 * TDD: RED phase - tests written before implementation
 */
import { describe, it, expect } from 'vitest';
import { checkForConflict } from '../services/conflictDetector';

describe('conflictDetector', () => {
    it('returns no conflict when local is newer', () => {
        const result = checkForConflict(2000, 1000);
        expect(result.hasConflict).toBe(false);
    });

    it('returns conflict when server is newer', () => {
        const result = checkForConflict(1000, 2000);
        expect(result.hasConflict).toBe(true);
        expect(result.localTimestamp).toBe(1000);
        expect(result.serverTimestamp).toBe(2000);
    });

    it('returns no conflict when timestamps are equal', () => {
        const result = checkForConflict(1500, 1500);
        expect(result.hasConflict).toBe(false);
    });

    it('returns correct timestamps in result', () => {
        const result = checkForConflict(500, 1500);
        expect(result.localTimestamp).toBe(500);
        expect(result.serverTimestamp).toBe(1500);
    });

    it('handles zero timestamps', () => {
        const result = checkForConflict(0, 0);
        expect(result.hasConflict).toBe(false);
    });
});
