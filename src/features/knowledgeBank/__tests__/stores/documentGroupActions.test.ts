/**
 * documentGroupActions.test.ts — Tests for document group store actions
 * toggleDocumentGroup, removeDocumentGroup, getDocumentCount
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useKnowledgeBankStore } from '../../stores/knowledgeBankStore';
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

describe('document group store actions', () => {
    beforeEach(() => {
        useKnowledgeBankStore.getState().clearEntries();
    });

    describe('toggleDocumentGroup', () => {
        it('disables parent + all children when parent is enabled', () => {
            const parent = makeEntry({ id: 'p1', enabled: true });
            const child1 = makeEntry({ id: 'c1', parentEntryId: 'p1', enabled: true });
            const child2 = makeEntry({ id: 'c2', parentEntryId: 'p1', enabled: true });
            useKnowledgeBankStore.getState().setEntries([parent, child1, child2]);

            useKnowledgeBankStore.getState().toggleDocumentGroup('p1');

            const entries = useKnowledgeBankStore.getState().entries;
            expect(entries.find((e) => e.id === 'p1')?.enabled).toBe(false);
            expect(entries.find((e) => e.id === 'c1')?.enabled).toBe(false);
            expect(entries.find((e) => e.id === 'c2')?.enabled).toBe(false);
        });

        it('enables parent + all children when parent is disabled', () => {
            const parent = makeEntry({ id: 'p1', enabled: false });
            const child1 = makeEntry({ id: 'c1', parentEntryId: 'p1', enabled: false });
            const child2 = makeEntry({ id: 'c2', parentEntryId: 'p1', enabled: true });
            useKnowledgeBankStore.getState().setEntries([parent, child1, child2]);

            useKnowledgeBankStore.getState().toggleDocumentGroup('p1');

            const entries = useKnowledgeBankStore.getState().entries;
            expect(entries.find((e) => e.id === 'p1')?.enabled).toBe(true);
            expect(entries.find((e) => e.id === 'c1')?.enabled).toBe(true);
            expect(entries.find((e) => e.id === 'c2')?.enabled).toBe(true);
        });

        it('normalizes mixed children to parent inverse when parent is enabled', () => {
            const parent = makeEntry({ id: 'p1', enabled: true });
            const child1 = makeEntry({ id: 'c1', parentEntryId: 'p1', enabled: false });
            const child2 = makeEntry({ id: 'c2', parentEntryId: 'p1', enabled: true });
            useKnowledgeBankStore.getState().setEntries([parent, child1, child2]);

            useKnowledgeBankStore.getState().toggleDocumentGroup('p1');

            const entries = useKnowledgeBankStore.getState().entries;
            expect(entries.every((e) => !e.enabled)).toBe(true);
        });

        it('is a no-op for non-existent parentId', () => {
            const entry = makeEntry({ id: 'e1' });
            useKnowledgeBankStore.getState().setEntries([entry]);

            useKnowledgeBankStore.getState().toggleDocumentGroup('nonexistent');

            expect(useKnowledgeBankStore.getState().entries).toHaveLength(1);
            expect(useKnowledgeBankStore.getState().entries[0]!.enabled).toBe(true);
        });

        it('does not affect unrelated entries', () => {
            const parent = makeEntry({ id: 'p1', enabled: true });
            const child = makeEntry({ id: 'c1', parentEntryId: 'p1', enabled: true });
            const unrelated = makeEntry({ id: 'u1', enabled: true });
            useKnowledgeBankStore.getState().setEntries([parent, child, unrelated]);

            useKnowledgeBankStore.getState().toggleDocumentGroup('p1');

            expect(useKnowledgeBankStore.getState().entries.find((e) => e.id === 'u1')?.enabled).toBe(true);
        });
    });

    describe('removeDocumentGroup', () => {
        it('removes parent and all children from store', () => {
            const parent = makeEntry({ id: 'p1' });
            const child1 = makeEntry({ id: 'c1', parentEntryId: 'p1' });
            const child2 = makeEntry({ id: 'c2', parentEntryId: 'p1' });
            useKnowledgeBankStore.getState().setEntries([parent, child1, child2]);

            useKnowledgeBankStore.getState().removeDocumentGroup('p1');

            expect(useKnowledgeBankStore.getState().entries).toHaveLength(0);
        });

        it('does not affect unrelated entries', () => {
            const parent = makeEntry({ id: 'p1' });
            const child = makeEntry({ id: 'c1', parentEntryId: 'p1' });
            const unrelated = makeEntry({ id: 'u1' });
            useKnowledgeBankStore.getState().setEntries([parent, child, unrelated]);

            useKnowledgeBankStore.getState().removeDocumentGroup('p1');

            const remaining = useKnowledgeBankStore.getState().entries;
            expect(remaining).toHaveLength(1);
            expect(remaining[0]!.id).toBe('u1');
        });
    });

    describe('getDocumentCount', () => {
        it('counts only entries without parentEntryId', () => {
            const standalone1 = makeEntry({ id: 's1' });
            const standalone2 = makeEntry({ id: 's2' });
            const parent = makeEntry({ id: 'p1' });
            const child1 = makeEntry({ id: 'c1', parentEntryId: 'p1' });
            const child2 = makeEntry({ id: 'c2', parentEntryId: 'p1' });
            useKnowledgeBankStore.getState().setEntries([standalone1, standalone2, parent, child1, child2]);

            expect(useKnowledgeBankStore.getState().getDocumentCount()).toBe(3);
        });

        it('returns 0 for empty store', () => {
            expect(useKnowledgeBankStore.getState().getDocumentCount()).toBe(0);
        });

        it('counts standalone entries correctly', () => {
            useKnowledgeBankStore.getState().setEntries([
                makeEntry({ id: 'a' }),
                makeEntry({ id: 'b' }),
            ]);
            expect(useKnowledgeBankStore.getState().getDocumentCount()).toBe(2);
        });
    });
});
