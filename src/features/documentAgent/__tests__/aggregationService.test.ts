/**
 * Aggregation Service Tests — periodic summaries across documents
 */
import { describe, it, expect, vi } from 'vitest';
import type { EntityIndexEntry } from '../types/entityIndex';

const mockCallGemini = vi.fn();

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    callGemini: (...args: unknown[]) => mockCallGemini(...args),
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import {
    shouldTriggerAggregation,
    groupEntriesByClassification,
    buildAggregationPrompt,
    parseAggregationResponse,
    AGGREGATION_INTERVAL_DOCS,
    AGGREGATION_COOLDOWN_MS,
} from '../services/aggregationService';
/* eslint-enable import-x/first */

const makeEntry = (classification: string, facts: string[]): EntityIndexEntry => ({
    nodeId: `n-${Math.random()}`,
    filename: `${classification}.pdf`,
    classification: classification as EntityIndexEntry['classification'],
    entities: facts,
    summary: `A ${classification} document`,
    analyzedAt: Date.now(),
});

describe('shouldTriggerAggregation', () => {
    it('returns true when analysis count is multiple of interval', () => {
        expect(shouldTriggerAggregation(5, 0)).toBe(true);
        expect(shouldTriggerAggregation(10, 0)).toBe(true);
    });

    it('returns false when count is not multiple', () => {
        expect(shouldTriggerAggregation(3, 0)).toBe(false);
        expect(shouldTriggerAggregation(7, 0)).toBe(false);
    });

    it('returns false when last aggregation was too recent', () => {
        const recentTime = Date.now() - 30 * 60 * 1000;
        expect(shouldTriggerAggregation(5, recentTime)).toBe(false);
    });

    it('returns true when last aggregation was long ago', () => {
        const oldTime = Date.now() - 2 * 60 * 60 * 1000;
        expect(shouldTriggerAggregation(5, oldTime)).toBe(true);
    });

    it('returns false for zero count', () => {
        expect(shouldTriggerAggregation(0, 0)).toBe(false);
    });
});

describe('groupEntriesByClassification', () => {
    it('groups entries by classification', () => {
        const entries = [
            makeEntry('invoice', ['$100']),
            makeEntry('invoice', ['$200']),
            makeEntry('payslip', ['$3000']),
        ];

        const groups = groupEntriesByClassification(entries);

        expect(groups.get('invoice')).toHaveLength(2);
        expect(groups.get('payslip')).toHaveLength(1);
    });

    it('returns empty map for empty entries', () => {
        expect(groupEntriesByClassification([]).size).toBe(0);
    });
});

describe('buildAggregationPrompt', () => {
    it('includes classification groups', () => {
        const groups = new Map([
            ['invoice', [makeEntry('invoice', ['$100']), makeEntry('invoice', ['$200'])]],
        ]);

        const prompt = buildAggregationPrompt(groups);

        expect(prompt).toContain('invoice');
        expect(prompt).toContain('2 documents');
    });

    it('includes entity details', () => {
        const groups = new Map([
            ['payslip', [makeEntry('payslip', ['Gross: $5000'])]],
        ]);

        const prompt = buildAggregationPrompt(groups);

        expect(prompt).toContain('$5000');
    });
});

describe('parseAggregationResponse', () => {
    it('parses valid summary sections', () => {
        const json = JSON.stringify({
            sections: [
                { classification: 'invoice', summary: '2 invoices totaling $300' },
            ],
        });

        const result = parseAggregationResponse(json);

        expect(result.sections).toHaveLength(1);
        expect(result.sections[0]?.summary).toContain('$300');
    });

    it('returns empty sections for invalid JSON', () => {
        const result = parseAggregationResponse('garbage');

        expect(result.sections).toEqual([]);
    });
});

describe('constants', () => {
    it('interval is 5 documents', () => {
        expect(AGGREGATION_INTERVAL_DOCS).toBe(5);
    });

    it('cooldown is 1 hour', () => {
        expect(AGGREGATION_COOLDOWN_MS).toBe(60 * 60 * 1000);
    });
});
