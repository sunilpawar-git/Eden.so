/**
 * Cross-Reference Formatter Tests
 */
import { describe, it, expect } from 'vitest';
import { strings } from '@/shared/localization/strings';
import { formatCrossRefMarkdown } from '../services/crossRefFormatter';
import type { CrossReferenceResult } from '../types/entityIndex';

const fullResult: CrossReferenceResult = {
    connections: ['Both reference Power Corp'],
    contradictions: ['Contract says $100, invoice says $142'],
    actionItems: ['Verify pricing with vendor'],
    relatedDocuments: ['contract.pdf'],
};

describe('formatCrossRefMarkdown', () => {
    it('includes heading with filename', () => {
        const md = formatCrossRefMarkdown(fullResult, 'invoice.pdf');

        expect(md).toContain(strings.documentAgent.crossRefHeading);
        expect(md).toContain('invoice.pdf');
    });

    it('includes connections section', () => {
        const md = formatCrossRefMarkdown(fullResult, 'test.pdf');

        expect(md).toContain(strings.documentAgent.crossRefConnections);
        expect(md).toContain('Power Corp');
    });

    it('includes contradictions section', () => {
        const md = formatCrossRefMarkdown(fullResult, 'test.pdf');

        expect(md).toContain(strings.documentAgent.crossRefContradictions);
    });

    it('includes action items section', () => {
        const md = formatCrossRefMarkdown(fullResult, 'test.pdf');

        expect(md).toContain(strings.documentAgent.crossRefActionItems);
    });

    it('includes related documents section', () => {
        const md = formatCrossRefMarkdown(fullResult, 'test.pdf');

        expect(md).toContain(strings.documentAgent.crossRefRelated);
        expect(md).toContain('contract.pdf');
    });

    it('omits empty sections', () => {
        const sparse: CrossReferenceResult = {
            connections: ['One connection'],
            contradictions: [],
            actionItems: [],
            relatedDocuments: [],
        };
        const md = formatCrossRefMarkdown(sparse, 'test.pdf');

        expect(md).toContain(strings.documentAgent.crossRefConnections);
        expect(md).not.toContain(strings.documentAgent.crossRefContradictions);
        expect(md).not.toContain(strings.documentAgent.crossRefActionItems);
    });

    it('all empty sections produces heading only', () => {
        const empty: CrossReferenceResult = {
            connections: [],
            contradictions: [],
            actionItems: [],
            relatedDocuments: [],
        };
        const md = formatCrossRefMarkdown(empty, 'test.pdf');

        expect(md).toContain(strings.documentAgent.crossRefHeading);
        expect(md.split('\n\n')).toHaveLength(1);
    });
});
