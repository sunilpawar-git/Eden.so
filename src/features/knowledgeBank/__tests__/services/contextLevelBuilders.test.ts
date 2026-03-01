/**
 * contextLevelBuilders.test.ts — Tests for individual context level build functions
 */
import { describe, it, expect } from 'vitest';
import {
    buildCatalog,
    buildDocSummaries,
    buildChapterSummaries,
    buildRawContent,
} from '../../services/contextLevelBuilders';
import type { KnowledgeBankEntry, DocumentGroup } from '../../types/knowledgeBank';

function makeEntry(overrides: Partial<KnowledgeBankEntry> = {}): KnowledgeBankEntry {
    return {
        id: 'e1', workspaceId: 'ws-1', type: 'document',
        title: 'Test', content: 'content', enabled: true,
        createdAt: new Date(), updatedAt: new Date(),
        ...overrides,
    };
}

function makeGroup(title: string, numChildren: number, summary?: string): DocumentGroup {
    const parent = makeEntry({ id: `p-${title}`, title, summary, content: 'parent content' });
    const children = Array.from({ length: numChildren }, (_, i) =>
        makeEntry({
            id: `c-${title}-${i}`,
            parentEntryId: parent.id,
            title: `${title} - Part ${i + 2}`,
            content: `chunk ${i + 2} content`,
            summary: `chunk ${i + 2} summary`,
        })
    );
    return { parent, children, totalParts: 1 + numChildren };
}

describe('buildCatalog', () => {
    it('returns empty string for no groups', () => {
        expect(buildCatalog([], 500)).toBe('');
    });

    it('lists document titles with section counts', () => {
        const groups = [makeGroup('Security Notes', 5), makeGroup('History', 3)];
        const catalog = buildCatalog(groups, 500);
        expect(catalog).toContain('Security Notes');
        expect(catalog).toContain('6 sections');
        expect(catalog).toContain('History');
        expect(catalog).toContain('4 sections');
    });

    it('truncates when budget is exceeded', () => {
        const groups = Array.from({ length: 50 }, (_, i) =>
            makeGroup(`Very Long Document Title Number ${i}`, 10)
        );
        const catalog = buildCatalog(groups, 200);
        expect(catalog.length).toBeLessThanOrEqual(250);
    });
});

describe('buildDocSummaries', () => {
    it('returns empty string for no groups', () => {
        expect(buildDocSummaries([], 500)).toBe('');
    });

    it('includes document summary when available', () => {
        const groups = [makeGroup('Security', 2, 'A comprehensive security overview')];
        const result = buildDocSummaries(groups, 1000);
        expect(result).toContain('A comprehensive security overview');
    });

    it('skips groups without summary', () => {
        const groups = [makeGroup('NoSummary', 2)];
        const result = buildDocSummaries(groups, 500);
        expect(result).toBe('');
    });
});

describe('buildChapterSummaries', () => {
    it('returns empty string for no groups', () => {
        expect(buildChapterSummaries([], 500)).toBe('');
    });

    it('includes chunk summaries from top groups', () => {
        const groups = [makeGroup('Security', 3, 'doc summary')];
        const result = buildChapterSummaries(groups, 2000);
        expect(result).toContain('chunk 2 summary');
        expect(result).toContain('chunk 3 summary');
    });

    it('respects budget', () => {
        const groups = [makeGroup('Doc', 20, 'summary')];
        const result = buildChapterSummaries(groups, 100);
        expect(result.length).toBeLessThanOrEqual(200);
    });
});

describe('buildRawContent', () => {
    it('returns empty string for no groups', () => {
        expect(buildRawContent([], 500)).toBe('');
    });

    it('includes raw chunk content', () => {
        const groups = [makeGroup('Doc', 2, 'summary')];
        const result = buildRawContent(groups, 2000);
        expect(result).toContain('chunk 2 content');
    });

    it('respects budget', () => {
        const groups = [makeGroup('Doc', 20, 'summary')];
        const result = buildRawContent(groups, 100);
        expect(result.length).toBeLessThanOrEqual(200);
    });
});
