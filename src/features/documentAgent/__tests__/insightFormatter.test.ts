/**
 * Insight Formatter Tests — markdown generation from extraction results
 */
import { describe, it, expect } from 'vitest';
import { formatInsightMarkdown } from '../services/insightFormatter';
import { strings } from '@/shared/localization/strings';
import { createMockExtraction } from './fixtures/extractionFixtures';

const fullResult = createMockExtraction({
    summary: 'Monthly electricity bill for $142.50.',
    keyFacts: ['Amount: $142.50', 'Due: Feb 15'],
    actionItems: ['Pay before due date'],
    questions: ['Is auto-pay enabled?'],
});

describe('formatInsightMarkdown', () => {
    it('includes summary section with header from strings', () => {
        const md = formatInsightMarkdown(fullResult, 'bill.pdf');

        expect(md).toContain(strings.documentAgent.summarySection);
        expect(md).toContain('Monthly electricity bill for $142.50.');
    });

    it('formats keyFacts as bullet list', () => {
        const md = formatInsightMarkdown(fullResult, 'bill.pdf');

        expect(md).toContain(strings.documentAgent.keyFactsSection);
        expect(md).toContain('- Amount: $142.50');
        expect(md).toContain('- Due: Feb 15');
    });

    it('formats actionItems as bullet list', () => {
        const md = formatInsightMarkdown(fullResult, 'bill.pdf');

        expect(md).toContain(strings.documentAgent.actionItemsSection);
        expect(md).toContain('- Pay before due date');
    });

    it('formats questions as bullet list', () => {
        const md = formatInsightMarkdown(fullResult, 'bill.pdf');

        expect(md).toContain(strings.documentAgent.questionsSection);
        expect(md).toContain('- Is auto-pay enabled?');
    });

    it('includes high confidence footer', () => {
        const md = formatInsightMarkdown(fullResult, 'bill.pdf');

        expect(md).toContain(strings.documentAgent.confidenceFooterHigh);
    });

    it('includes medium confidence footer', () => {
        const result = createMockExtraction({ ...fullResult, confidence: 'medium' });
        const md = formatInsightMarkdown(result, 'bill.pdf');

        expect(md).toContain(strings.documentAgent.confidenceFooterMedium);
    });

    it('includes low confidence footer', () => {
        const result = createMockExtraction({ ...fullResult, confidence: 'low' });
        const md = formatInsightMarkdown(result, 'bill.pdf');

        expect(md).toContain(strings.documentAgent.confidenceFooterLow);
    });

    it('omits keyFacts section when array is empty', () => {
        const result = createMockExtraction({ ...fullResult, keyFacts: [] });
        const md = formatInsightMarkdown(result, 'file.pdf');

        expect(md).not.toContain(strings.documentAgent.keyFactsSection);
    });

    it('omits actionItems section when array is empty', () => {
        const result = createMockExtraction({ ...fullResult, actionItems: [] });
        const md = formatInsightMarkdown(result, 'file.pdf');

        expect(md).not.toContain(strings.documentAgent.actionItemsSection);
    });

    it('omits questions section when array is empty', () => {
        const result = createMockExtraction({ ...fullResult, questions: [] });
        const md = formatInsightMarkdown(result, 'file.pdf');

        expect(md).not.toContain(strings.documentAgent.questionsSection);
    });

    it('includes filename in output', () => {
        const md = formatInsightMarkdown(fullResult, 'quarterly-report.pdf');

        expect(md).toContain('quarterly-report.pdf');
    });

    it('includes extendedFacts section when present', () => {
        const result = createMockExtraction({
            ...fullResult,
            extendedFacts: ['Vendor: Power Corp', 'Account: 12345'],
        });
        const md = formatInsightMarkdown(result, 'bill.pdf');

        expect(md).toContain(strings.documentAgent.extendedFactsSection);
        expect(md).toContain('Vendor: Power Corp');
    });

    it('omits extendedFacts section when empty', () => {
        const result = createMockExtraction({ ...fullResult, extendedFacts: [] });
        const md = formatInsightMarkdown(result, 'bill.pdf');

        expect(md).not.toContain(strings.documentAgent.extendedFactsSection);
    });
});
