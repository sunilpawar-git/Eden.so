/**
 * Entity Index Types Tests
 */
import { describe, it, expect } from 'vitest';
import {
    extractEntities,
    CROSS_REF_SCORE_THRESHOLD,
    CROSS_REF_MAX_MATCHES,
    ENTITY_MAX_LENGTH,
    INDEX_STALE_MS,
} from '../types/entityIndex';
import { createMockExtraction } from './fixtures/extractionFixtures';

const mockResult = createMockExtraction({
    summary: 'Monthly invoice from ACME Corp',
    keyFacts: ['Total: $500', 'Due: March 15'],
    actionItems: ['Pay before deadline'],
    questions: ['Is auto-pay enabled?'],
    extendedFacts: ['Vendor: ACME Corp', 'Account: 12345'],
});

describe('extractEntities', () => {
    it('combines keyFacts, extendedFacts, and actionItems', () => {
        const entities = extractEntities(mockResult);

        expect(entities).toContain('Total: $500');
        expect(entities).toContain('Due: March 15');
        expect(entities).toContain('Vendor: ACME Corp');
        expect(entities).toContain('Account: 12345');
        expect(entities).toContain('Pay before deadline');
    });

    it('excludes questions and summary', () => {
        const entities = extractEntities(mockResult);

        expect(entities).not.toContain('Is auto-pay enabled?');
        expect(entities).not.toContain('Monthly invoice from ACME Corp');
    });

    it('truncates long entities to ENTITY_MAX_LENGTH', () => {
        const longResult = createMockExtraction({
            ...mockResult,
            keyFacts: ['a'.repeat(300)],
            actionItems: [],
            extendedFacts: [],
        });
        const entities = extractEntities(longResult);

        expect(entities[0]?.length).toBeLessThanOrEqual(ENTITY_MAX_LENGTH);
    });

    it('returns empty array when all fields are empty', () => {
        const emptyResult = createMockExtraction({
            keyFacts: [],
            actionItems: [],
            extendedFacts: [],
        });

        expect(extractEntities(emptyResult)).toEqual([]);
    });
});

describe('constants', () => {
    it('has correct score threshold', () => {
        expect(CROSS_REF_SCORE_THRESHOLD).toBe(0.1);
    });

    it('caps matches at 5', () => {
        expect(CROSS_REF_MAX_MATCHES).toBe(5);
    });

    it('entity max length is 200', () => {
        expect(ENTITY_MAX_LENGTH).toBe(200);
    });

    it('index stale time is 5 minutes', () => {
        expect(INDEX_STALE_MS).toBe(300_000);
    });
});
