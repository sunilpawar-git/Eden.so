/**
 * Node Pool Cache Tests — TDD RED phase
 * Verifies memoization of TF-IDF corpus and IDF map
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { NodePoolCache } from '../nodePoolCache';
import type { NodePoolEntry } from '../../types/nodePool';

function makeEntry(id: string, title: string, content: string, tags: string[] = []): NodePoolEntry {
    return { id, title, content, tags };
}

describe('NodePoolCache', () => {
    let cache: NodePoolCache;

    beforeEach(() => {
        cache = new NodePoolCache();
    });

    describe('getCorpusData', () => {
        const entries = [
            makeEntry('n1', 'Strategy', 'We need a marketing plan'),
            makeEntry('n2', 'Vision', 'Long term growth goals'),
        ];

        it('returns corpus and IDF map', () => {
            const data = cache.getCorpusData(entries);
            expect(data.corpus).toHaveLength(2);
            expect(data.idfMap).toBeInstanceOf(Map);
            expect(data.idfMap.size).toBeGreaterThan(0);
        });

        it('returns same reference when entries have not changed', () => {
            const first = cache.getCorpusData(entries);
            const second = cache.getCorpusData(entries);
            expect(first.corpus).toBe(second.corpus);
            expect(first.idfMap).toBe(second.idfMap);
        });

        it('rebuilds when entries change', () => {
            const first = cache.getCorpusData(entries);
            const newEntries = [
                ...entries,
                makeEntry('n3', 'Tactics', 'Short term actions'),
            ];
            const second = cache.getCorpusData(newEntries);
            expect(second.corpus).not.toBe(first.corpus);
            expect(second.corpus).toHaveLength(3);
        });

        it('rebuilds when entry content changes', () => {
            const first = cache.getCorpusData(entries);
            const modifiedEntries: NodePoolEntry[] = [
                makeEntry('n1', 'Strategy', 'Updated marketing plan'),
                entries[1]!,
            ];
            const second = cache.getCorpusData(modifiedEntries);
            expect(second.corpus).not.toBe(first.corpus);
        });

        it('rebuilds when content changes to same-length text', () => {
            const original = [makeEntry('n1', 'A', 'abc')];
            const first = cache.getCorpusData(original);
            const sameLengthChange = [makeEntry('n1', 'A', 'xyz')];
            const second = cache.getCorpusData(sameLengthChange);
            expect(second.corpus).not.toBe(first.corpus);
        });
    });

    describe('rankEntries', () => {
        const entries = [
            makeEntry('n1', 'Marketing Plan', 'Social media strategy and ads'),
            makeEntry('n2', 'Engineering', 'Backend architecture and APIs'),
            makeEntry('n3', 'Marketing Budget', 'Budget allocation for marketing'),
        ];

        it('ranks entries by relevance to prompt', () => {
            const ranked = cache.rankEntries(entries, 'marketing strategy');
            expect(ranked[0]!.id).toBe('n1');
        });

        it('returns all entries', () => {
            const ranked = cache.rankEntries(entries, 'marketing');
            expect(ranked).toHaveLength(3);
        });

        it('handles empty prompt gracefully', () => {
            const ranked = cache.rankEntries(entries, '');
            expect(ranked).toHaveLength(3);
        });

        it('handles empty entries gracefully', () => {
            const ranked = cache.rankEntries([], 'marketing');
            expect(ranked).toEqual([]);
        });

        it('uses cached corpus for same entries', () => {
            const first = cache.getCorpusData(entries);
            cache.rankEntries(entries, 'marketing');
            const second = cache.getCorpusData(entries);
            expect(first.corpus).toBe(second.corpus);
        });
    });
});
