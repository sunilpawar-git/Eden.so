/**
 * documentRelevanceScorer.test.ts — Tests for document-level relevance scoring
 * Multi-signal formula: titleScore*3 + docSummaryScore*2 + max(chunkScores)*1 + avg(top3)*0.5
 */
import { describe, it, expect } from 'vitest';
import { scoreDocumentGroup, rankDocumentGroups } from '../../services/documentRelevanceScorer';
import type { KnowledgeBankEntry, DocumentGroup } from '../../types/knowledgeBank';

function makeEntry(overrides: Partial<KnowledgeBankEntry> = {}): KnowledgeBankEntry {
    return {
        id: `kb-${Math.random().toString(36).slice(2, 9)}`,
        workspaceId: 'ws-1',
        type: 'document',
        title: 'Test Entry',
        content: 'generic content',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function makeGroup(parentOverrides: Partial<KnowledgeBankEntry> = {}, childContents: string[] = []): DocumentGroup {
    const parent = makeEntry({ id: 'p1', ...parentOverrides });
    const children = childContents.map((content, i) =>
        makeEntry({ id: `c${i}`, parentEntryId: 'p1', content })
    );
    return { parent, children, totalParts: 1 + children.length };
}

describe('scoreDocumentGroup', () => {
    it('returns 0 for empty keywords', () => {
        const group = makeGroup({ title: 'Security' });
        expect(scoreDocumentGroup(group, [])).toBe(0);
    });

    it('weights parent title match at 3x', () => {
        const group = makeGroup({ title: 'Physical Security Notes', content: 'unrelated' });
        const score = scoreDocumentGroup(group, ['security']);
        expect(score).toBeGreaterThan(0);

        const noTitleGroup = makeGroup({ title: 'Random', content: 'security stuff' });
        const noTitleScore = scoreDocumentGroup(noTitleGroup, ['security']);
        expect(score).toBeGreaterThan(noTitleScore);
    });

    it('weights document summary match at 2x', () => {
        const withSummary = makeGroup({
            title: 'Notes',
            summary: 'This covers physical security protocols',
            content: 'unrelated',
        });
        const withoutSummary = makeGroup({
            title: 'Notes',
            content: 'This covers physical security protocols',
        });
        const summaryScore = scoreDocumentGroup(withSummary, ['security']);
        const contentScore = scoreDocumentGroup(withoutSummary, ['security']);
        expect(summaryScore).toBeGreaterThan(contentScore);
    });

    it('includes max chunk score', () => {
        const group = makeGroup(
            { title: 'Other Topic' },
            ['irrelevant', 'security protocols detailed', 'also irrelevant']
        );
        const score = scoreDocumentGroup(group, ['security']);
        expect(score).toBeGreaterThan(0);
    });

    it('includes average of top-3 chunk scores', () => {
        const group = makeGroup(
            { title: 'Unrelated' },
            ['security one', 'security two', 'security three', 'unrelated']
        );
        const singleGroup = makeGroup(
            { title: 'Unrelated' },
            ['security one', 'unrelated', 'unrelated', 'unrelated']
        );
        const multiScore = scoreDocumentGroup(group, ['security']);
        const singleScore = scoreDocumentGroup(singleGroup, ['security']);
        expect(multiScore).toBeGreaterThan(singleScore);
    });

    it('falls back gracefully when no document summary exists', () => {
        const group = makeGroup({ title: 'Security', content: 'content about security' });
        const score = scoreDocumentGroup(group, ['security']);
        expect(score).toBeGreaterThan(0);
    });
});

describe('rankDocumentGroups', () => {
    it('sorts groups by descending score', () => {
        const high = makeGroup({ title: 'Security Protocols', content: 'security' });
        high.parent.id = 'high';
        const low = makeGroup({ title: 'Cooking Recipes', content: 'cooking' });
        low.parent.id = 'low';

        const ranked = rankDocumentGroups([low, high], 'security protocols');
        expect(ranked[0]!.parent.id).toBe('high');
        expect(ranked[1]!.parent.id).toBe('low');
    });

    it('preserves original order when no prompt is given', () => {
        const a = makeGroup({ title: 'AAA' }); a.parent.id = 'a';
        const b = makeGroup({ title: 'BBB' }); b.parent.id = 'b';

        const ranked = rankDocumentGroups([a, b]);
        expect(ranked[0]!.parent.id).toBe('a');
        expect(ranked[1]!.parent.id).toBe('b');
    });

    it('preserves order for equal scores', () => {
        const a = makeGroup({ title: 'Same' }); a.parent.id = 'a';
        const b = makeGroup({ title: 'Same' }); b.parent.id = 'b';

        const ranked = rankDocumentGroups([a, b], 'same');
        expect(ranked[0]!.parent.id).toBe('a');
    });
});
