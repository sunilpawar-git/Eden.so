/**
 * RelevanceScorer Tests — TDD RED phase
 * Tests keyword-based relevance scoring for smart context injection
 */
import { describe, it, expect } from 'vitest';
import {
    scoreEntry,
    rankEntries,
    tokenize,
} from '../../services/relevanceScorer';

describe('tokenize', () => {
    it('splits text into lowercase words', () => {
        expect(tokenize('Hello World')).toEqual(['hello', 'world']);
    });

    it('removes common stop words', () => {
        const tokens = tokenize('the quick brown fox is a test');
        expect(tokens).not.toContain('the');
        expect(tokens).not.toContain('is');
        expect(tokens).not.toContain('a');
        expect(tokens).toContain('quick');
        expect(tokens).toContain('brown');
    });

    it('removes punctuation', () => {
        expect(tokenize('hello, world! how?')).toEqual(['hello', 'world']);
    });

    it('filters out short words (< 3 chars)', () => {
        expect(tokenize('an AI is ok to do it')).toEqual([]);
    });

    it('returns empty array for empty string', () => {
        expect(tokenize('')).toEqual([]);
    });

    it('deduplicates tokens', () => {
        const tokens = tokenize('test test test');
        expect(tokens).toEqual(['test']);
    });
});

describe('scoreEntry', () => {
    const entry = {
        title: 'Machine Learning Overview',
        content: 'Neural networks and deep learning techniques for classification tasks.',
        summary: 'Overview of ML classification methods.',
    };

    it('scores higher for title matches', () => {
        const score = scoreEntry(entry, ['machine', 'learning']);
        expect(score).toBeGreaterThan(0);
    });

    it('scores for content matches', () => {
        const score = scoreEntry(entry, ['neural', 'networks']);
        expect(score).toBeGreaterThan(0);
    });

    it('prefers summary over content when available', () => {
        const score = scoreEntry(entry, ['classification', 'methods']);
        expect(score).toBeGreaterThan(0);
    });

    it('returns 0 for no keyword overlap', () => {
        const score = scoreEntry(entry, ['basketball', 'cooking']);
        expect(score).toBe(0);
    });

    it('title match weighs more than content match', () => {
        // "learning" is in title; "techniques" is only in content
        const titleScore = scoreEntry(entry, ['learning']);
        const contentScore = scoreEntry(entry, ['techniques']);
        expect(titleScore).toBeGreaterThan(contentScore);
    });

    it('returns 0 for empty keywords', () => {
        expect(scoreEntry(entry, [])).toBe(0);
    });
});

describe('rankEntries', () => {
    const entries = [
        { title: 'Cooking Recipes', content: 'How to make pasta.', summary: undefined },
        { title: 'Machine Learning', content: 'Neural networks overview.', summary: undefined },
        { title: 'Budget Report', content: 'Q4 financial data.', summary: undefined },
    ];

    it('ranks entries by relevance to prompt', () => {
        const ranked = rankEntries(entries, 'neural network machine learning');
        expect(ranked[0]!.title).toBe('Machine Learning');
    });

    it('puts unrelated entries last', () => {
        const ranked = rankEntries(entries, 'neural network machine learning');
        expect(ranked[ranked.length - 1]!.title).not.toBe('Machine Learning');
    });

    it('returns all entries (none excluded)', () => {
        const ranked = rankEntries(entries, 'anything');
        expect(ranked).toHaveLength(3);
    });

    it('preserves original order when no prompt provided', () => {
        const ranked = rankEntries(entries, '');
        expect(ranked[0]!.title).toBe('Cooking Recipes');
        expect(ranked[1]!.title).toBe('Machine Learning');
        expect(ranked[2]!.title).toBe('Budget Report');
    });

    it('preserves original order when prompt has no meaningful keywords', () => {
        const ranked = rankEntries(entries, 'the a is');
        expect(ranked).toEqual(entries);
    });

    it('handles entries with summaries', () => {
        const withSummaries = [
            { title: 'Doc A', content: 'Long content...', summary: 'About cooking' },
            { title: 'Doc B', content: 'Long content...', summary: 'About machine learning' },
        ];
        const ranked = rankEntries(withSummaries, 'cooking');
        expect(ranked[0]!.title).toBe('Doc A');
    });

    it('ranks tagged entries higher for matching keywords', () => {
        const tagged = [
            { title: 'Notes A', content: 'Some generic notes.', tags: ['design'] },
            { title: 'Notes B', content: 'Some generic notes.', tags: ['finance'] },
        ];
        const ranked = rankEntries(tagged, 'finance report');
        expect(ranked[0]!.title).toBe('Notes B');
    });

    it('tag match weighs less than title match', () => {
        const mixed = [
            { title: 'Finance Overview', content: 'General info.' },
            { title: 'Random Notes', content: 'General info.', tags: ['finance'] },
        ];
        const ranked = rankEntries(mixed, 'finance');
        expect(ranked[0]!.title).toBe('Finance Overview');
    });
});
