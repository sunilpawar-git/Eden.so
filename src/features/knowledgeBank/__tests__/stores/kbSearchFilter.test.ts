/**
 * KB Search & Filter Tests — TDD
 * Tests for store search/filter state + filterEntries pure function
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useKnowledgeBankStore, filterEntries } from '../../stores/knowledgeBankStore';
import type { KnowledgeBankEntry } from '../../types/knowledgeBank';

const mockEntry = (overrides: Partial<KnowledgeBankEntry>): KnowledgeBankEntry => ({
    id: 'kb-1',
    workspaceId: 'ws-1',
    type: 'text',
    title: 'Test Entry',
    content: 'Some content here',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const entries: KnowledgeBankEntry[] = [
    mockEntry({ id: 'kb-1', type: 'text', title: 'Meeting Notes', content: 'Discussed roadmap' }),
    mockEntry({ id: 'kb-2', type: 'image', title: 'Architecture Diagram', content: 'System architecture' }),
    mockEntry({ id: 'kb-3', type: 'document', title: 'Research Paper', content: 'Machine learning analysis' }),
    mockEntry({ id: 'kb-4', type: 'text', title: 'API Reference', content: 'Endpoint documentation' }),
    mockEntry({ id: 'kb-5', type: 'document', title: 'Budget Report', content: 'Quarterly budget' }),
];

describe('filterEntries (pure function)', () => {
    it('returns all entries when filter is "all" and no query', () => {
        expect(filterEntries(entries, '', 'all')).toHaveLength(5);
    });

    it('filters by type "text"', () => {
        const result = filterEntries(entries, '', 'text');
        expect(result).toHaveLength(2);
        expect(result.every((e) => e.type === 'text')).toBe(true);
    });

    it('filters by type "image"', () => {
        const result = filterEntries(entries, '', 'image');
        expect(result).toHaveLength(1);
        expect(result[0]!.type).toBe('image');
    });

    it('filters by type "document"', () => {
        const result = filterEntries(entries, '', 'document');
        expect(result).toHaveLength(2);
        expect(result.every((e) => e.type === 'document')).toBe(true);
    });

    it('searches by title (case-insensitive)', () => {
        const result = filterEntries(entries, 'meeting', 'all');
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('kb-1');
    });

    it('searches by content (case-insensitive)', () => {
        const result = filterEntries(entries, 'machine learning', 'all');
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('kb-3');
    });

    it('combines type filter and search query', () => {
        const result = filterEntries(entries, 'report', 'document');
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('kb-5');
    });

    it('returns empty array when no matches', () => {
        expect(filterEntries(entries, 'nonexistent', 'all')).toHaveLength(0);
    });

    it('ignores whitespace-only search queries', () => {
        expect(filterEntries(entries, '   ', 'all')).toHaveLength(5);
    });

    it('handles empty entries array', () => {
        expect(filterEntries([], 'test', 'all')).toHaveLength(0);
    });
});

describe('knowledgeBankStore search/filter', () => {
    beforeEach(() => {
        useKnowledgeBankStore.setState({
            entries,
            isPanelOpen: true,
            searchQuery: '',
            typeFilter: 'all',
        });
    });

    describe('setSearchQuery', () => {
        it('updates search query state', () => {
            useKnowledgeBankStore.getState().setSearchQuery('meeting');
            expect(useKnowledgeBankStore.getState().searchQuery).toBe('meeting');
        });
    });

    describe('setTypeFilter', () => {
        it('updates type filter state', () => {
            useKnowledgeBankStore.getState().setTypeFilter('image');
            expect(useKnowledgeBankStore.getState().typeFilter).toBe('image');
        });
    });

    describe('getFilteredEntries', () => {
        it('returns all entries with no filter', () => {
            const result = useKnowledgeBankStore.getState().getFilteredEntries();
            expect(result).toHaveLength(5);
        });

        it('filters by search query', () => {
            useKnowledgeBankStore.getState().setSearchQuery('architecture');
            const result = useKnowledgeBankStore.getState().getFilteredEntries();
            expect(result).toHaveLength(1);
            expect(result[0]!.id).toBe('kb-2');
        });

        it('filters by type', () => {
            useKnowledgeBankStore.getState().setTypeFilter('document');
            const result = useKnowledgeBankStore.getState().getFilteredEntries();
            expect(result).toHaveLength(2);
        });

        it('combines search and type filter', () => {
            useKnowledgeBankStore.getState().setSearchQuery('budget');
            useKnowledgeBankStore.getState().setTypeFilter('document');
            const result = useKnowledgeBankStore.getState().getFilteredEntries();
            expect(result).toHaveLength(1);
            expect(result[0]!.id).toBe('kb-5');
        });
    });
});
