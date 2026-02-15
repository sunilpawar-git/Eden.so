/**
 * Knowledge Bank Context Builder Tests
 * TDD: Tests for buildKBContextBlock utility (with summary + relevance support)
 */
import { describe, it, expect } from 'vitest';
import { buildKBContextBlock } from '../hooks/useKnowledgeBankContext';

describe('buildKBContextBlock', () => {
    it('returns empty string when no entries', () => {
        expect(buildKBContextBlock([])).toBe('');
    });

    it('formats single entry correctly', () => {
        const result = buildKBContextBlock([
            { title: 'Brand Voice', content: 'Professional and concise tone.' },
        ]);
        expect(result).toContain('--- Workspace Knowledge Bank ---');
        expect(result).toContain('[Knowledge: Brand Voice]');
        expect(result).toContain('Professional and concise tone.');
        expect(result).toContain('--- End Knowledge Bank ---');
    });

    it('formats multiple entries', () => {
        const result = buildKBContextBlock([
            { title: 'Style', content: 'Use bullet points.' },
            { title: 'Audience', content: 'Engineers and PMs.' },
        ]);
        expect(result).toContain('[Knowledge: Style]');
        expect(result).toContain('[Knowledge: Audience]');
    });

    it('truncates entries that exceed token budget', () => {
        // KB_MAX_CONTEXT_TOKENS = 8000, CHARS_PER_TOKEN = 4, so ~32000 chars max
        const bigContent = 'x'.repeat(31_950);
        const result = buildKBContextBlock([
            { title: 'Big', content: bigContent },
            { title: 'Should Be Excluded', content: 'This should not appear' },
        ]);
        expect(result).toContain('[Knowledge: Big]');
        expect(result).not.toContain('Should Be Excluded');
    });

    it('returns empty string if first entry alone exceeds budget', () => {
        // KB_MAX_CONTEXT_TOKENS = 8000, CHARS_PER_TOKEN = 4, so budget = 32000 chars
        const hugeContent = 'x'.repeat(33_000);
        const result = buildKBContextBlock([
            { title: 'Huge', content: hugeContent },
        ]);
        expect(result).toBe('');
    });

    describe('summary preference', () => {
        it('uses summary when available instead of content', () => {
            const result = buildKBContextBlock([
                {
                    title: 'Long Doc',
                    content: 'Very long content that is thousands of characters...',
                    summary: 'Concise summary of the long document.',
                },
            ]);
            expect(result).toContain('Concise summary of the long document.');
            expect(result).not.toContain('Very long content');
        });

        it('falls back to content when summary is undefined', () => {
            const result = buildKBContextBlock([
                { title: 'No Summary', content: 'Original content here.' },
            ]);
            expect(result).toContain('Original content here.');
        });

        it('fits more entries in budget when using summaries', () => {
            // Without summaries, only 1 entry fits. With summaries, both fit.
            const bigContent = 'x'.repeat(20_000);
            const result = buildKBContextBlock([
                { title: 'Doc 1', content: bigContent, summary: 'Summary of doc 1.' },
                { title: 'Doc 2', content: bigContent, summary: 'Summary of doc 2.' },
            ]);
            expect(result).toContain('[Knowledge: Doc 1]');
            expect(result).toContain('[Knowledge: Doc 2]');
            expect(result).toContain('Summary of doc 1.');
            expect(result).toContain('Summary of doc 2.');
        });
    });

    describe('prompt-aware relevance ranking', () => {
        const entries = [
            { title: 'Cooking Recipes', content: 'How to make pasta and bread.' },
            { title: 'Machine Learning', content: 'Neural networks and classification.' },
            { title: 'Budget Report', content: 'Q4 financial data and revenue.' },
        ];

        it('ranks most relevant entry first when prompt is provided', () => {
            const result = buildKBContextBlock(entries, 'neural network classification');
            const mlIndex = result.indexOf('Machine Learning');
            const cookIndex = result.indexOf('Cooking Recipes');
            expect(mlIndex).toBeLessThan(cookIndex);
        });

        it('preserves original order when no prompt is given', () => {
            const result = buildKBContextBlock(entries);
            const cookIndex = result.indexOf('Cooking Recipes');
            const mlIndex = result.indexOf('Machine Learning');
            expect(cookIndex).toBeLessThan(mlIndex);
        });

        it('preserves original order when prompt is empty string', () => {
            const result = buildKBContextBlock(entries, '');
            const cookIndex = result.indexOf('Cooking Recipes');
            const mlIndex = result.indexOf('Machine Learning');
            expect(cookIndex).toBeLessThan(mlIndex);
        });
    });
});
