/**
 * TF-IDF Scorer Tests — Pure math functions for term frequency–inverse document frequency
 * Single responsibility: TF-IDF computation, no domain logic
 */
import { describe, it, expect } from 'vitest';
import {
    computeTF,
    computeIDF,
    buildCorpusIDF,
    tfidfScore,
} from '../../services/tfidfScorer';

describe('computeTF', () => {
    it('returns correct term frequency ratio', () => {
        const tokens = ['machine', 'learning', 'machine', 'deep'];
        // "machine" appears 2/4 times
        expect(computeTF(tokens, 'machine')).toBeCloseTo(0.5);
    });

    it('returns 0 for absent term', () => {
        expect(computeTF(['hello', 'world'], 'missing')).toBe(0);
    });

    it('returns 0 for empty tokens array', () => {
        expect(computeTF([], 'anything')).toBe(0);
    });

    it('handles single token', () => {
        expect(computeTF(['test'], 'test')).toBeCloseTo(1.0);
    });

    it('repeated terms produce higher TF than single occurrence', () => {
        // "machine" 3/5 vs "machine" 1/5 — duplicates must be preserved
        const repeated = computeTF(['machine', 'machine', 'machine', 'deep', 'learning'], 'machine');
        const single = computeTF(['machine', 'deep', 'learning', 'neural', 'vision'], 'machine');
        expect(repeated).toBeGreaterThan(single);
    });
});

describe('computeIDF', () => {
    it('returns higher value for rarer terms', () => {
        // Term in 1 of 10 docs → higher IDF than term in 5 of 10 docs
        const rareIDF = computeIDF(10, 1);
        const commonIDF = computeIDF(10, 5);
        expect(rareIDF).toBeGreaterThan(commonIDF);
    });

    it('returns 0 when term appears in all documents', () => {
        expect(computeIDF(10, 10)).toBe(0);
    });

    it('returns 0 when totalDocs is 0', () => {
        expect(computeIDF(0, 0)).toBe(0);
    });

    it('returns positive value for term in some docs', () => {
        expect(computeIDF(5, 2)).toBeGreaterThan(0);
    });
});

describe('buildCorpusIDF', () => {
    it('builds correct IDF map from tokenized documents', () => {
        const corpus = [
            ['machine', 'learning', 'deep'],
            ['machine', 'vision', 'neural'],
            ['cooking', 'recipe', 'pasta'],
        ];
        const idfMap = buildCorpusIDF(corpus);

        // "machine" in 2/3 docs, "cooking" in 1/3 docs
        // cooking should have higher IDF (rarer)
        expect(idfMap.get('cooking')!).toBeGreaterThan(idfMap.get('machine')!);
    });

    it('assigns 0 IDF to terms in all documents', () => {
        const corpus = [
            ['common', 'alpha'],
            ['common', 'beta'],
        ];
        const idfMap = buildCorpusIDF(corpus);
        expect(idfMap.get('common')).toBe(0);
    });

    it('handles empty corpus', () => {
        const idfMap = buildCorpusIDF([]);
        expect(idfMap.size).toBe(0);
    });

    it('handles single document corpus', () => {
        const idfMap = buildCorpusIDF([['alpha', 'beta']]);
        // Both terms in 1/1 doc → IDF = 0
        expect(idfMap.get('alpha')).toBe(0);
        expect(idfMap.get('beta')).toBe(0);
    });
});

describe('tfidfScore', () => {
    it('returns higher score when query matches rare terms in document', () => {
        const corpus = [
            ['machine', 'learning', 'quantum'],
            ['machine', 'learning', 'neural'],
            ['machine', 'learning', 'deep'],
        ];
        const idfMap = buildCorpusIDF(corpus);

        // "quantum" is rare (1/3 docs), "machine" is common (3/3 docs)
        const rareScore = tfidfScore(
            ['machine', 'learning', 'quantum'],
            ['quantum'],
            idfMap
        );
        const commonScore = tfidfScore(
            ['machine', 'learning', 'quantum'],
            ['machine'],
            idfMap
        );
        expect(rareScore).toBeGreaterThan(commonScore);
    });

    it('returns 0 when no query terms match document', () => {
        const idfMap = new Map([['alpha', 1.0]]);
        expect(tfidfScore(['alpha', 'beta'], ['gamma'], idfMap)).toBe(0);
    });

    it('returns 0 for empty query', () => {
        const idfMap = new Map([['alpha', 1.0]]);
        expect(tfidfScore(['alpha'], [], idfMap)).toBe(0);
    });

    it('returns 0 for empty document', () => {
        const idfMap = new Map([['alpha', 1.0]]);
        expect(tfidfScore([], ['alpha'], idfMap)).toBe(0);
    });

    it('accumulates score across multiple matching terms', () => {
        const idfMap = new Map([
            ['alpha', 1.0],
            ['beta', 0.5],
        ]);
        const singleScore = tfidfScore(['alpha', 'beta'], ['alpha'], idfMap);
        const doubleScore = tfidfScore(['alpha', 'beta'], ['alpha', 'beta'], idfMap);
        expect(doubleScore).toBeGreaterThan(singleScore);
    });
});
