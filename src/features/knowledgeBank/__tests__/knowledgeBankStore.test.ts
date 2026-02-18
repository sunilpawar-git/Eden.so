/**
 * Knowledge Bank Store Tests
 * TDD: Tests for all store actions and selectors
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useKnowledgeBankStore } from '../stores/knowledgeBankStore';
import type { KnowledgeBankEntry } from '../types/knowledgeBank';

const createMockEntry = (overrides?: Partial<KnowledgeBankEntry>): KnowledgeBankEntry => ({
    id: `kb-${Date.now()}`,
    workspaceId: 'ws-1',
    type: 'text',
    title: 'Test Entry',
    content: 'Test content',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('knowledgeBankStore', () => {
    beforeEach(() => {
        useKnowledgeBankStore.setState({
            entries: [],
            isPanelOpen: false,
            searchQuery: '',
            typeFilter: 'all',
        });
    });

    describe('initial state', () => {
        it('starts with empty entries', () => {
            const state = useKnowledgeBankStore.getState();
            expect(state.entries).toEqual([]);
            expect(state.isPanelOpen).toBe(false);
        });
    });

    describe('addEntry', () => {
        it('adds an entry to the list', () => {
            const entry = createMockEntry({ id: 'kb-1' });
            useKnowledgeBankStore.getState().addEntry(entry);
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(1);
            expect(useKnowledgeBankStore.getState().entries[0]!.id).toBe('kb-1');
        });

        it('appends to existing entries', () => {
            const entry1 = createMockEntry({ id: 'kb-1' });
            const entry2 = createMockEntry({ id: 'kb-2' });
            useKnowledgeBankStore.getState().addEntry(entry1);
            useKnowledgeBankStore.getState().addEntry(entry2);
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(2);
        });
    });

    describe('updateEntry', () => {
        it('updates the matching entry', () => {
            const entry = createMockEntry({ id: 'kb-1', title: 'Old Title' });
            useKnowledgeBankStore.getState().addEntry(entry);
            useKnowledgeBankStore.getState().updateEntry('kb-1', { title: 'New Title' });
            expect(useKnowledgeBankStore.getState().entries[0]!.title).toBe('New Title');
        });

        it('does not affect other entries', () => {
            const entry1 = createMockEntry({ id: 'kb-1', title: 'Keep' });
            const entry2 = createMockEntry({ id: 'kb-2', title: 'Change' });
            useKnowledgeBankStore.getState().setEntries([entry1, entry2]);
            useKnowledgeBankStore.getState().updateEntry('kb-2', { title: 'Changed' });
            expect(useKnowledgeBankStore.getState().entries[0]!.title).toBe('Keep');
            expect(useKnowledgeBankStore.getState().entries[1]!.title).toBe('Changed');
        });
    });

    describe('removeEntry', () => {
        it('removes the matching entry', () => {
            const entry = createMockEntry({ id: 'kb-1' });
            useKnowledgeBankStore.getState().addEntry(entry);
            useKnowledgeBankStore.getState().removeEntry('kb-1');
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(0);
        });
    });

    describe('toggleEntry', () => {
        it('toggles enabled state', () => {
            const entry = createMockEntry({ id: 'kb-1', enabled: true });
            useKnowledgeBankStore.getState().addEntry(entry);
            useKnowledgeBankStore.getState().toggleEntry('kb-1');
            expect(useKnowledgeBankStore.getState().entries[0]!.enabled).toBe(false);
            useKnowledgeBankStore.getState().toggleEntry('kb-1');
            expect(useKnowledgeBankStore.getState().entries[0]!.enabled).toBe(true);
        });
    });

    describe('getEnabledEntries', () => {
        it('returns only enabled entries', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1', enabled: true }),
                createMockEntry({ id: 'kb-2', enabled: false }),
                createMockEntry({ id: 'kb-3', enabled: true }),
            ]);
            const enabled = useKnowledgeBankStore.getState().getEnabledEntries();
            expect(enabled).toHaveLength(2);
            expect(enabled.map((e) => e.id)).toEqual(['kb-1', 'kb-3']);
        });

        it('returns empty array when no entries enabled', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1', enabled: false }),
            ]);
            expect(useKnowledgeBankStore.getState().getEnabledEntries()).toHaveLength(0);
        });
    });

    describe('getEntryCount', () => {
        it('returns total entry count', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1' }),
                createMockEntry({ id: 'kb-2' }),
            ]);
            expect(useKnowledgeBankStore.getState().getEntryCount()).toBe(2);
        });
    });


    describe('setPanelOpen', () => {
        it('controls panel visibility', () => {
            useKnowledgeBankStore.getState().setPanelOpen(true);
            expect(useKnowledgeBankStore.getState().isPanelOpen).toBe(true);
            useKnowledgeBankStore.getState().setPanelOpen(false);
            expect(useKnowledgeBankStore.getState().isPanelOpen).toBe(false);
        });
    });

    describe('clearEntries', () => {
        it('removes all entries', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1' }),
                createMockEntry({ id: 'kb-2' }),
            ]);
            useKnowledgeBankStore.getState().clearEntries();
            expect(useKnowledgeBankStore.getState().entries).toHaveLength(0);
        });
    });

    describe('pinEntry / unpinEntry / getPinnedEntries', () => {
        it('pinEntry sets pinned to true and updates updatedAt', () => {
            const entry = createMockEntry({ id: 'kb-1', enabled: true });
            useKnowledgeBankStore.getState().addEntry(entry);
            const beforeDate = useKnowledgeBankStore.getState().entries[0]!.updatedAt;
            useKnowledgeBankStore.getState().pinEntry('kb-1');
            const updated = useKnowledgeBankStore.getState().entries[0]!;
            expect(updated.pinned).toBe(true);
            expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
        });

        it('unpinEntry sets pinned to false', () => {
            const entry = createMockEntry({ id: 'kb-1', enabled: true });
            useKnowledgeBankStore.getState().addEntry(entry);
            useKnowledgeBankStore.getState().pinEntry('kb-1');
            useKnowledgeBankStore.getState().unpinEntry('kb-1');
            expect(useKnowledgeBankStore.getState().entries[0]!.pinned).toBe(false);
        });

        it('getPinnedEntries returns only pinned + enabled entries', () => {
            useKnowledgeBankStore.getState().setEntries([
                createMockEntry({ id: 'kb-1', enabled: true, pinned: true }),
                createMockEntry({ id: 'kb-2', enabled: true, pinned: false }),
                createMockEntry({ id: 'kb-3', enabled: false, pinned: true }),
                createMockEntry({ id: 'kb-4', enabled: true }),  // pinned undefined → not pinned
            ]);
            const pinned = useKnowledgeBankStore.getState().getPinnedEntries();
            expect(pinned).toHaveLength(1);
            expect(pinned[0]!.id).toBe('kb-1');
        });
    });

    describe('summarizingEntryIds', () => {
        it('starts empty', () => {
            expect(useKnowledgeBankStore.getState().summarizingEntryIds).toEqual([]);
        });

        it('setSummarizingEntryIds sets the IDs', () => {
            useKnowledgeBankStore.getState().setSummarizingEntryIds(['kb-1', 'kb-2']);
            expect(useKnowledgeBankStore.getState().summarizingEntryIds).toEqual(['kb-1', 'kb-2']);
        });

        it('removeSummarizingEntryId removes a single ID', () => {
            useKnowledgeBankStore.getState().setSummarizingEntryIds(['kb-1', 'kb-2', 'kb-3']);
            useKnowledgeBankStore.getState().removeSummarizingEntryId('kb-2');
            expect(useKnowledgeBankStore.getState().summarizingEntryIds).toEqual(['kb-1', 'kb-3']);
        });

        it('removeSummarizingEntryId is safe when ID is not present', () => {
            useKnowledgeBankStore.getState().setSummarizingEntryIds(['kb-1']);
            useKnowledgeBankStore.getState().removeSummarizingEntryId('kb-99');
            expect(useKnowledgeBankStore.getState().summarizingEntryIds).toEqual(['kb-1']);
        });

        it('setSummarizingEntryIds with empty array clears all', () => {
            useKnowledgeBankStore.getState().setSummarizingEntryIds(['kb-1', 'kb-2']);
            useKnowledgeBankStore.getState().setSummarizingEntryIds([]);
            expect(useKnowledgeBankStore.getState().summarizingEntryIds).toEqual([]);
        });
    });
});
