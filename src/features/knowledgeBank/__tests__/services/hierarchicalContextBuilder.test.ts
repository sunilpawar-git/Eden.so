/**
 * hierarchicalContextBuilder.test.ts — Tests for the 4-level hierarchical context builder
 */
import { describe, it, expect } from 'vitest';
import { buildHierarchicalKBContext } from '../../services/hierarchicalContextBuilder';
import type { KnowledgeBankEntry } from '../../types/knowledgeBank';

function makeEntry(overrides: Partial<KnowledgeBankEntry> = {}): KnowledgeBankEntry {
    return {
        id: `kb-${Math.random().toString(36).slice(2, 9)}`,
        workspaceId: 'ws-1',
        type: 'document',
        title: 'Test Entry',
        content: 'Some content for testing',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('buildHierarchicalKBContext', () => {
    it('returns empty string for empty entries', () => {
        expect(buildHierarchicalKBContext([])).toBe('');
    });

    it('handles single standalone entry with flat format', () => {
        const entry = makeEntry({ title: 'Solo Note', content: 'just a note' });
        const result = buildHierarchicalKBContext([entry]);

        expect(result).toContain('Workspace Knowledge Bank');
        expect(result).toContain('[Knowledge: Solo Note]');
        expect(result).toContain('just a note');
    });

    it('handles multiple standalone entries ranked by relevance', () => {
        const a = makeEntry({ title: 'Cooking tips', content: 'bake at 350' });
        const b = makeEntry({ title: 'Security protocols', content: 'physical security measures' });
        const result = buildHierarchicalKBContext([a, b], 'security');

        expect(result).toContain('Security protocols');
        expect(result).toContain('Cooking tips');
        const secIdx = result.indexOf('Security protocols');
        const cookIdx = result.indexOf('Cooking tips');
        expect(secIdx).toBeLessThan(cookIdx);
    });

    it('builds 4-level hierarchy for a document group', () => {
        const parent = makeEntry({
            id: 'p1', title: 'Security - Part 1',
            content: 'parent content about security',
            summary: 'Comprehensive security document covering all protocols',
            documentSummaryStatus: 'ready',
        });
        const child1 = makeEntry({
            id: 'c1', parentEntryId: 'p1',
            title: 'Security - Part 2',
            content: 'physical security measures',
            summary: 'Covers physical security',
        });
        const child2 = makeEntry({
            id: 'c2', parentEntryId: 'p1',
            title: 'Security - Part 3',
            content: 'digital security measures',
            summary: 'Covers digital security',
        });

        const result = buildHierarchicalKBContext([parent, child1, child2]);

        expect(result).toContain('DOCUMENT CATALOG');
        expect(result).toContain('3 sections');
        expect(result).toContain('DOCUMENT SUMMARIES');
        expect(result).toContain('Comprehensive security document');
        expect(result).toContain('CHAPTER SUMMARIES');
        expect(result).toContain('RAW CONTENT');
    });

    it('catalog shows document title with section count', () => {
        const parent = makeEntry({ id: 'p1', title: 'My Doc - Part 1', content: 'content' });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1', content: 'child content' });

        const result = buildHierarchicalKBContext([parent, child]);
        expect(result).toContain('My Doc - Part 1');
        expect(result).toContain('2 sections');
    });

    it('includes document summary in level 2', () => {
        const parent = makeEntry({
            id: 'p1', title: 'Doc',
            content: 'content',
            summary: 'This is the full document summary',
            documentSummaryStatus: 'ready',
        });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1', content: 'chunk' });

        const result = buildHierarchicalKBContext([parent, child]);
        expect(result).toContain('This is the full document summary');
    });

    it('skips document summary when status is pending', () => {
        const parent = makeEntry({
            id: 'p1', title: 'Doc',
            content: 'content',
            summary: undefined,
            documentSummaryStatus: 'pending',
        });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1', content: 'chunk' });

        const result = buildHierarchicalKBContext([parent, child]);
        expect(result).toContain('DOCUMENT CATALOG');
        expect(result).toContain('RAW CONTENT');
    });

    it('includes chapter summaries from top documents', () => {
        const parent = makeEntry({
            id: 'p1', content: 'p content', summary: 'p summary',
        });
        const child = makeEntry({
            id: 'c1', parentEntryId: 'p1',
            title: 'Chapter 2', content: 'c content',
            summary: 'Chapter 2 covers important topics',
        });

        const result = buildHierarchicalKBContext([parent, child]);
        expect(result).toContain('Chapter 2 covers important topics');
    });

    it('includes raw content from top document', () => {
        const parent = makeEntry({ id: 'p1', content: 'raw parent text' });
        const child = makeEntry({
            id: 'c1', parentEntryId: 'p1',
            content: 'raw child text with details',
        });

        const result = buildHierarchicalKBContext([parent, child]);
        expect(result).toContain('raw parent text');
        expect(result).toContain('raw child text with details');
    });

    it('uses deep-detail budget for 1 document', () => {
        const parent = makeEntry({
            id: 'p1', content: 'x'.repeat(5000),
            summary: 'doc summary',
            documentSummaryStatus: 'ready',
        });
        const child = makeEntry({
            id: 'c1', parentEntryId: 'p1',
            content: 'y'.repeat(5000),
            summary: 'chunk summary',
        });

        const result = buildHierarchicalKBContext([parent, child]);
        expect(result).toContain('RAW CONTENT');
        expect(result.length).toBeGreaterThan(100);
    });

    it('handles pinned entries with priority', () => {
        const parent = makeEntry({
            id: 'p1', title: 'Unpinned Doc', content: 'unpinned',
        });
        const child1 = makeEntry({ id: 'c1', parentEntryId: 'p1', content: 'chunk' });

        const pinnedEntry = makeEntry({
            id: 'pinned', title: 'Pinned Note', content: 'important', pinned: true,
        });

        const result = buildHierarchicalKBContext([parent, child1, pinnedEntry]);
        expect(result).toContain('Pinned Note');
    });

    it('wraps output in Knowledge Bank markers', () => {
        const entry = makeEntry({ title: 'Test' });
        const result = buildHierarchicalKBContext([entry]);

        expect(result).toMatch(/^--- Workspace Knowledge Bank ---/);
        expect(result).toMatch(/--- End Knowledge Bank ---$/);
    });

    it('maintains backward-compatible wrapper format', () => {
        const entry = makeEntry({ title: 'Test', content: 'content' });
        const result = buildHierarchicalKBContext([entry]);

        expect(result.startsWith('--- Workspace Knowledge Bank ---')).toBe(true);
        expect(result.endsWith('--- End Knowledge Bank ---')).toBe(true);
    });

    it('handles mixed standalone and grouped entries', () => {
        const standalone = makeEntry({ id: 's1', title: 'Standalone Note', content: 'solo content' });
        const parent = makeEntry({ id: 'p1', title: 'Grouped Doc - Part 1', content: 'parent' });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1', content: 'child' });

        const result = buildHierarchicalKBContext([standalone, parent, child]);
        expect(result).toContain('Standalone Note');
        expect(result).toContain('Grouped Doc');
    });

    it('respects generation type budget', () => {
        const entries = Array.from({ length: 10 }, (_, i) =>
            makeEntry({ id: `e${i}`, title: `Entry ${i}`, content: 'x'.repeat(5000) })
        );

        const singleResult = buildHierarchicalKBContext(entries, undefined, 'single');
        const transformResult = buildHierarchicalKBContext(entries, undefined, 'transform');

        expect(singleResult.length).toBeGreaterThan(transformResult.length);
    });
});
