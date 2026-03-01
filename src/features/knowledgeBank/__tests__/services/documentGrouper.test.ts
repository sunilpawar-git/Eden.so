/**
 * documentGrouper.test.ts — Tests for document grouping pure function
 * Groups KB entries by parentEntryId into DocumentGroup structures
 */
import { describe, it, expect } from 'vitest';
import { groupEntriesByDocument, getDisplayTitle } from '../../services/documentGrouper';
import type { KnowledgeBankEntry } from '../../types/knowledgeBank';

function makeEntry(overrides: Partial<KnowledgeBankEntry> = {}): KnowledgeBankEntry {
    return {
        id: `kb-${Math.random().toString(36).slice(2, 9)}`,
        workspaceId: 'ws-1',
        type: 'text',
        title: 'Test Entry',
        content: 'Some content',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('groupEntriesByDocument', () => {
    it('returns empty groups for empty input', () => {
        const result = groupEntriesByDocument([]);
        expect(result.standalone).toEqual([]);
        expect(result.documents).toEqual([]);
    });

    it('treats all entries without parentEntryId as standalone', () => {
        const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })];
        const result = groupEntriesByDocument(entries);
        expect(result.standalone).toHaveLength(2);
        expect(result.documents).toHaveLength(0);
    });

    it('groups a parent with its children into a DocumentGroup', () => {
        const parent = makeEntry({ id: 'parent-1', type: 'document', title: 'Doc - Part 1' });
        const child1 = makeEntry({ id: 'child-1', parentEntryId: 'parent-1', title: 'Doc - Part 2' });
        const child2 = makeEntry({ id: 'child-2', parentEntryId: 'parent-1', title: 'Doc - Part 3' });
        const result = groupEntriesByDocument([parent, child1, child2]);

        expect(result.documents).toHaveLength(1);
        expect(result.documents[0].parent.id).toBe('parent-1');
        expect(result.documents[0].children).toHaveLength(2);
        expect(result.documents[0].totalParts).toBe(3);
        expect(result.standalone).toHaveLength(0);
    });

    it('handles mixed standalone and grouped entries', () => {
        const standalone = makeEntry({ id: 'solo-1', type: 'text' });
        const parent = makeEntry({ id: 'parent-1', type: 'document' });
        const child = makeEntry({ id: 'child-1', parentEntryId: 'parent-1' });
        const result = groupEntriesByDocument([standalone, parent, child]);

        expect(result.standalone).toHaveLength(1);
        expect(result.standalone[0].id).toBe('solo-1');
        expect(result.documents).toHaveLength(1);
        expect(result.documents[0].totalParts).toBe(2);
    });

    it('treats orphaned children (no matching parent) as standalone', () => {
        const orphan = makeEntry({ id: 'orphan-1', parentEntryId: 'nonexistent' });
        const result = groupEntriesByDocument([orphan]);

        expect(result.standalone).toHaveLength(1);
        expect(result.standalone[0].id).toBe('orphan-1');
        expect(result.documents).toHaveLength(0);
    });

    it('treats parent with no children as standalone', () => {
        const loneParent = makeEntry({ id: 'parent-1', type: 'document' });
        const result = groupEntriesByDocument([loneParent]);

        expect(result.standalone).toHaveLength(1);
        expect(result.documents).toHaveLength(0);
    });

    it('correctly counts totalParts including parent', () => {
        const parent = makeEntry({ id: 'p1', type: 'document' });
        const children = Array.from({ length: 9 }, (_, i) =>
            makeEntry({ id: `c${i}`, parentEntryId: 'p1' })
        );
        const result = groupEntriesByDocument([parent, ...children]);

        expect(result.documents[0].totalParts).toBe(10);
    });

    it('handles multiple document groups simultaneously', () => {
        const p1 = makeEntry({ id: 'p1', type: 'document' });
        const c1 = makeEntry({ id: 'c1', parentEntryId: 'p1' });
        const p2 = makeEntry({ id: 'p2', type: 'document' });
        const c2a = makeEntry({ id: 'c2a', parentEntryId: 'p2' });
        const c2b = makeEntry({ id: 'c2b', parentEntryId: 'p2' });
        const result = groupEntriesByDocument([p1, c1, p2, c2a, c2b]);

        expect(result.documents).toHaveLength(2);
        expect(result.documents.find((d) => d.parent.id === 'p1')?.totalParts).toBe(2);
        expect(result.documents.find((d) => d.parent.id === 'p2')?.totalParts).toBe(3);
    });

    it('preserves entry references (no cloning)', () => {
        const parent = makeEntry({ id: 'p1', type: 'document' });
        const child = makeEntry({ id: 'c1', parentEntryId: 'p1' });
        const result = groupEntriesByDocument([parent, child]);

        expect(result.documents[0].parent).toBe(parent);
        expect(result.documents[0].children[0]).toBe(child);
    });
});

describe('getDisplayTitle', () => {
    it('strips " - Part 1" suffix from parent title', () => {
        const parent = makeEntry({ title: 'Physical Security Notes - Part 1' });
        expect(getDisplayTitle(parent)).toBe('Physical Security Notes');
    });

    it('strips " - Part 01" zero-padded suffix', () => {
        const parent = makeEntry({ title: 'My Document - Part 01' });
        expect(getDisplayTitle(parent)).toBe('My Document');
    });

    it('preserves title without part suffix', () => {
        const parent = makeEntry({ title: 'Regular Document Title' });
        expect(getDisplayTitle(parent)).toBe('Regular Document Title');
    });

    it('strips only the first part suffix', () => {
        const parent = makeEntry({ title: 'Doc Part 2 - Part 1' });
        expect(getDisplayTitle(parent)).toBe('Doc Part 2');
    });
});
