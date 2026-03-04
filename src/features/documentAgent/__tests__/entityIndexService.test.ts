/**
 * Entity Index Service Tests — building and querying the in-memory entity index
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { ExtractionResult } from '../types/documentAgent';
import type { EntityIndexEntry } from '../types/entityIndex';
import {
    buildEntityIndex,
    queryEntityIndex,
    addEntryToIndex,
} from '../services/entityIndexService';

const makeNode = (id: string, extraction: ExtractionResult | undefined, filename = 'doc.pdf'): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    data: {
        heading: 'Test',
        attachments: extraction ? [{
            filename,
            url: `https://example.com/${filename}`,
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            extraction,
            analyzedAt: Date.now(),
        }] : undefined,
    },
    position: { x: 0, y: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
});

const invoiceResult: ExtractionResult = {
    classification: 'invoice',
    confidence: 'high',
    summary: 'Monthly electricity bill from Power Corp',
    keyFacts: ['Total: $142', 'Due: March 15', 'Power Corp'],
    actionItems: ['Pay before deadline'],
    questions: [],
    extendedFacts: ['Vendor: Power Corp', 'Account: 99887'],
};

const payslipResult: ExtractionResult = {
    classification: 'payslip',
    confidence: 'high',
    summary: 'January payslip from TechCo',
    keyFacts: ['Gross: $5000', 'Net: $3800', 'TechCo'],
    actionItems: [],
    questions: [],
    extendedFacts: ['Employer: TechCo', 'Period: January'],
};

const meetingResult: ExtractionResult = {
    classification: 'meeting_notes',
    confidence: 'medium',
    summary: 'Q1 review meeting with Power Corp team',
    keyFacts: ['Power Corp partnership renewal', 'Budget: $50000'],
    actionItems: ['Schedule follow-up'],
    questions: [],
    extendedFacts: ['Decision: Renew contract'],
};

describe('buildEntityIndex', () => {
    it('builds index from nodes with extractions', () => {
        const nodes = [
            makeNode('n1', invoiceResult, 'invoice.pdf'),
            makeNode('n2', payslipResult, 'payslip.pdf'),
            makeNode('n3', undefined),
        ];

        const index = buildEntityIndex(nodes);

        expect(index.entries).toHaveLength(2);
        expect(index.entries[0]?.nodeId).toBe('n1');
        expect(index.entries[1]?.nodeId).toBe('n2');
    });

    it('builds IDF map from entity tokens', () => {
        const nodes = [makeNode('n1', invoiceResult)];
        const index = buildEntityIndex(nodes);

        expect(index.idfMap.size).toBeGreaterThan(0);
    });

    it('sets lastBuilt timestamp', () => {
        const before = Date.now();
        const index = buildEntityIndex([]);
        const after = Date.now();

        expect(index.lastBuilt).toBeGreaterThanOrEqual(before);
        expect(index.lastBuilt).toBeLessThanOrEqual(after);
    });

    it('returns empty index for nodes without extractions', () => {
        const nodes = [makeNode('n1', undefined), makeNode('n2', undefined)];
        const index = buildEntityIndex(nodes);

        expect(index.entries).toHaveLength(0);
    });
});

describe('queryEntityIndex', () => {
    let index: ReturnType<typeof buildEntityIndex>;

    beforeEach(() => {
        const nodes = [
            makeNode('n1', invoiceResult, 'invoice.pdf'),
            makeNode('n2', payslipResult, 'payslip.pdf'),
            makeNode('n3', meetingResult, 'meeting.pdf'),
        ];
        index = buildEntityIndex(nodes);
    });

    it('finds matches by overlapping entities', () => {
        const queryEntities = invoiceResult.keyFacts;
        const matches = queryEntityIndex(index, queryEntities, 'new-node');

        expect(matches.length).toBeGreaterThanOrEqual(1);
        const nodeIds = matches.map((m) => m.entry.nodeId);
        expect(nodeIds).toContain('n1');
    });

    it('excludes the querying node itself', () => {
        const queryEntities = ['Total: $142', 'Power Corp'];
        const matches = queryEntityIndex(index, queryEntities, 'n1');

        const nodeIds = matches.map((m) => m.entry.nodeId);
        expect(nodeIds).not.toContain('n1');
    });

    it('returns empty for unrelated entities', () => {
        const matches = queryEntityIndex(index, ['Quantum physics', 'Mars rover'], 'new');

        expect(matches).toHaveLength(0);
    });

    it('caps results at CROSS_REF_MAX_MATCHES', () => {
        const manyNodes = Array.from({ length: 10 }, (_, i) =>
            makeNode(`n${i}`, { ...invoiceResult, keyFacts: ['Common entity'] }),
        );
        const bigIndex = buildEntityIndex(manyNodes);
        const matches = queryEntityIndex(bigIndex, ['Common entity'], 'query-node');

        expect(matches.length).toBeLessThanOrEqual(5);
    });

    it('sorts matches by score descending', () => {
        const matches = queryEntityIndex(index, ['Power Corp', 'Total', '$142'], 'new');

        for (let i = 1; i < matches.length; i++) {
            const prev = matches[i - 1];
            const curr = matches[i];
            if (prev && curr) {
                expect(prev.score).toBeGreaterThanOrEqual(curr.score);
            }
        }
    });
});

describe('addEntryToIndex', () => {
    it('adds a new entry to existing index', () => {
        const index = buildEntityIndex([]);
        const entry: EntityIndexEntry = {
            nodeId: 'new-1',
            filename: 'new.pdf',
            classification: 'invoice',
            entities: ['New vendor', 'Amount: $100'],
            summary: 'New invoice',
            analyzedAt: Date.now(),
        };

        const updated = addEntryToIndex(index, entry);

        expect(updated.entries).toHaveLength(1);
        expect(updated.entries[0]?.nodeId).toBe('new-1');
    });

    it('replaces entry for same nodeId', () => {
        const nodes = [makeNode('n1', invoiceResult)];
        const index = buildEntityIndex(nodes);
        const replacement: EntityIndexEntry = {
            nodeId: 'n1',
            filename: 'updated.pdf',
            classification: 'payslip',
            entities: ['Updated entity'],
            summary: 'Updated',
            analyzedAt: Date.now(),
        };

        const updated = addEntryToIndex(index, replacement);

        expect(updated.entries).toHaveLength(1);
        expect(updated.entries[0]?.classification).toBe('payslip');
    });

    it('rebuilds IDF map after adding', () => {
        const index = buildEntityIndex([]);
        const entry: EntityIndexEntry = {
            nodeId: 'n1',
            filename: 'a.pdf',
            classification: 'generic',
            entities: ['unique term here'],
            summary: 'test',
            analyzedAt: Date.now(),
        };

        const updated = addEntryToIndex(index, entry);

        expect(updated.idfMap.size).toBeGreaterThan(0);
    });
});
