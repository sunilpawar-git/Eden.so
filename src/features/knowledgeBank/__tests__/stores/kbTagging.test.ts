/**
 * KB Tagging Tests — TDD for tag filtering, extractAllTags, and store actions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useKnowledgeBankStore, filterEntries, extractAllTags } from '../../stores/knowledgeBankStore';
import type { KnowledgeBankEntry } from '../../types/knowledgeBank';

function createEntry(overrides: Partial<KnowledgeBankEntry> = {}): KnowledgeBankEntry {
    return {
        id: `kb-${Math.random().toString(36).slice(2)}`,
        workspaceId: 'ws-1',
        type: 'text',
        title: 'Test Entry',
        content: 'Some content here.',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('extractAllTags', () => {
    it('returns empty array when no entries', () => {
        expect(extractAllTags([])).toEqual([]);
    });

    it('returns empty array when no entries have tags', () => {
        const entries = [createEntry(), createEntry()];
        expect(extractAllTags(entries)).toEqual([]);
    });

    it('extracts unique tags sorted alphabetically', () => {
        const entries = [
            createEntry({ tags: ['machine-learning', 'ai'] }),
            createEntry({ tags: ['design', 'ai'] }),
        ];
        expect(extractAllTags(entries)).toEqual(['ai', 'design', 'machine-learning']);
    });

    it('handles entries with empty tags array', () => {
        const entries = [createEntry({ tags: [] }), createEntry({ tags: ['solo'] })];
        expect(extractAllTags(entries)).toEqual(['solo']);
    });
});

describe('filterEntries with tags', () => {
    const entries = [
        createEntry({ id: '1', title: 'ML Basics', tags: ['ml', 'ai'] }),
        createEntry({ id: '2', title: 'Design Guide', tags: ['design'] }),
        createEntry({ id: '3', title: 'Notes', tags: undefined }),
    ];

    it('filters by selectedTag', () => {
        const result = filterEntries(entries, '', 'all', 'ml');
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('1');
    });

    it('returns all when selectedTag is null', () => {
        const result = filterEntries(entries, '', 'all', null);
        expect(result).toHaveLength(3);
    });

    it('returns all when selectedTag is undefined', () => {
        const result = filterEntries(entries, '', 'all');
        expect(result).toHaveLength(3);
    });

    it('combines tag filter with type filter', () => {
        const mixed = [
            createEntry({ id: '1', type: 'text', tags: ['ai'] }),
            createEntry({ id: '2', type: 'image', tags: ['ai'] }),
        ];
        const result = filterEntries(mixed, '', 'text', 'ai');
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('1');
    });

    it('searches within tags text', () => {
        const result = filterEntries(entries, 'design', 'all', null);
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('2');
    });

    it('search matches tag even when title/content do not match', () => {
        const tagOnly = [
            createEntry({ id: '1', title: 'X', content: 'Y', tags: ['finance'] }),
        ];
        const result = filterEntries(tagOnly, 'finance', 'all', null);
        expect(result).toHaveLength(1);
    });
});

describe('store tag actions', () => {
    beforeEach(() => {
        useKnowledgeBankStore.setState({
            entries: [],
            isPanelOpen: false,
            searchQuery: '',
            typeFilter: 'all',
            selectedTag: null,
        });
    });

    it('setSelectedTag updates state', () => {
        useKnowledgeBankStore.getState().setSelectedTag('ai');
        expect(useKnowledgeBankStore.getState().selectedTag).toBe('ai');
    });

    it('setSelectedTag to null clears filter', () => {
        useKnowledgeBankStore.getState().setSelectedTag('ai');
        useKnowledgeBankStore.getState().setSelectedTag(null);
        expect(useKnowledgeBankStore.getState().selectedTag).toBeNull();
    });

    it('getAllTags returns unique sorted tags from entries', () => {
        useKnowledgeBankStore.getState().setEntries([
            createEntry({ tags: ['beta', 'alpha'] }),
            createEntry({ tags: ['gamma', 'alpha'] }),
        ]);
        expect(useKnowledgeBankStore.getState().getAllTags()).toEqual([
            'alpha', 'beta', 'gamma',
        ]);
    });

    it('getFilteredEntries respects selectedTag', () => {
        useKnowledgeBankStore.getState().setEntries([
            createEntry({ tags: ['ai'] }),
            createEntry({ tags: ['design'] }),
        ]);
        useKnowledgeBankStore.getState().setSelectedTag('ai');
        const filtered = useKnowledgeBankStore.getState().getFilteredEntries();
        expect(filtered).toHaveLength(1);
        expect(filtered[0]!.tags).toContain('ai');
    });

    it('updateEntry can add tags to an entry', () => {
        const entry = createEntry({ id: 'e1' });
        useKnowledgeBankStore.getState().setEntries([entry]);
        useKnowledgeBankStore.getState().updateEntry('e1', { tags: ['new-tag'] });
        const updated = useKnowledgeBankStore.getState().entries[0];
        expect(updated!.tags).toEqual(['new-tag']);
    });
});
