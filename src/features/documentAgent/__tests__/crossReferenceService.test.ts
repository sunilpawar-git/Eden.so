/**
 * Cross-Reference Service Tests
 */
import { describe, it, expect, vi } from 'vitest';
import type { CrossReferenceMatch } from '../types/entityIndex';
import type { ExtractionResult } from '../types/documentAgent';

const mockCallGemini = vi.fn();

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    callGemini: (...args: unknown[]) => mockCallGemini(...args),
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import {
    buildCrossRefPrompt,
    parseCrossRefResponse,
    CrossRefResultSchema,
} from '../services/crossReferenceService';
/* eslint-enable import-x/first */

const newDocResult: ExtractionResult = {
    classification: 'invoice',
    confidence: 'high',
    summary: 'Electricity bill from Power Corp, $142 due March 15',
    keyFacts: ['Total: $142', 'Vendor: Power Corp'],
    actionItems: ['Pay before deadline'],
    questions: [],
    extendedFacts: [],
};

const matches: CrossReferenceMatch[] = [
    {
        entry: {
            nodeId: 'n1',
            filename: 'contract.pdf',
            classification: 'legal_contract',
            entities: ['Power Corp', 'Annual contract'],
            summary: 'Annual service contract with Power Corp',
            analyzedAt: Date.now(),
        },
        score: 0.8,
        overlappingEntities: ['Power Corp'],
    },
];

describe('buildCrossRefPrompt', () => {
    it('includes new document summary', () => {
        const prompt = buildCrossRefPrompt(newDocResult, 'bill.pdf', matches);

        expect(prompt).toContain('Electricity bill from Power Corp');
    });

    it('includes matched document summaries', () => {
        const prompt = buildCrossRefPrompt(newDocResult, 'bill.pdf', matches);

        expect(prompt).toContain('Annual service contract with Power Corp');
    });

    it('includes overlapping entities', () => {
        const prompt = buildCrossRefPrompt(newDocResult, 'bill.pdf', matches);

        expect(prompt).toContain('Power Corp');
    });

    it('includes JSON output format instructions', () => {
        const prompt = buildCrossRefPrompt(newDocResult, 'bill.pdf', matches);

        expect(prompt).toContain('connections');
        expect(prompt).toContain('contradictions');
        expect(prompt).toContain('actionItems');
    });
});

describe('CrossRefResultSchema', () => {
    it('parses valid cross-reference result', () => {
        const valid = {
            connections: ['Both reference Power Corp'],
            contradictions: [],
            actionItems: ['Review contract terms'],
            relatedDocuments: ['contract.pdf'],
        };

        const parsed = CrossRefResultSchema.parse(valid);
        expect(parsed.connections).toHaveLength(1);
    });

    it('fills defaults for missing fields', () => {
        const parsed = CrossRefResultSchema.parse({});

        expect(parsed.connections).toEqual([]);
        expect(parsed.contradictions).toEqual([]);
        expect(parsed.actionItems).toEqual([]);
        expect(parsed.relatedDocuments).toEqual([]);
    });

    it('catches invalid types with empty arrays', () => {
        const parsed = CrossRefResultSchema.parse({
            connections: 'not array',
            contradictions: 123,
        });

        expect(parsed.connections).toEqual([]);
        expect(parsed.contradictions).toEqual([]);
    });
});

describe('parseCrossRefResponse', () => {
    it('parses valid JSON response', () => {
        const json = JSON.stringify({
            connections: ['Shared vendor'],
            contradictions: [],
            actionItems: ['Compare pricing'],
            relatedDocuments: ['contract.pdf'],
        });

        const result = parseCrossRefResponse(json);

        expect(result.connections).toEqual(['Shared vendor']);
    });

    it('handles markdown-fenced JSON', () => {
        const fenced = `\`\`\`json\n${JSON.stringify({ connections: ['test'] })}\n\`\`\``;
        const result = parseCrossRefResponse(fenced);

        expect(result.connections).toEqual(['test']);
    });

    it('returns defaults for garbage input', () => {
        const result = parseCrossRefResponse('not json at all');

        expect(result.connections).toEqual([]);
    });
});
