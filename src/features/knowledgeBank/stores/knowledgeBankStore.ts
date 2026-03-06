/**
 * Knowledge Bank Store — ViewModel for KB state
 * Manages entries, search/filter, and panel visibility
 */
import { create } from 'zustand';
import type {
    KnowledgeBankEntry,
    KnowledgeBankState,
    KnowledgeBankActions,
    KBTypeFilter,
} from '../types/knowledgeBank';

type KnowledgeBankStore = KnowledgeBankState & KnowledgeBankActions;

const initialState: KnowledgeBankState = {
    entries: [],
    isPanelOpen: false,
    searchQuery: '',
    typeFilter: 'all',
    selectedTag: null,
    summarizingEntryIds: [],
};

// ---------------------------------------------------------------------------
// Action factory types
// ---------------------------------------------------------------------------

type SetFn = (partial: Partial<KnowledgeBankStore> | ((s: KnowledgeBankStore) => Partial<KnowledgeBankStore>)) => void;
type GetFn = () => KnowledgeBankStore;

// ---------------------------------------------------------------------------
// Entry CRUD actions
// ---------------------------------------------------------------------------

function createKBEntryActions(set: SetFn) {
    return {
        setEntries: (entries: KnowledgeBankEntry[]) => set({ entries }),

        addEntry: (entry: KnowledgeBankEntry) =>
            set((state) => ({ entries: [...state.entries, entry] })),

        updateEntry: (entryId: string, updates: Partial<KnowledgeBankEntry>) =>
            set((state) => ({
                entries: state.entries.map((e) =>
                    e.id === entryId ? { ...e, ...updates, updatedAt: new Date() } : e
                ),
            })),

        removeEntry: (entryId: string) =>
            set((state) => ({ entries: state.entries.filter((e) => e.id !== entryId) })),

        toggleEntry: (entryId: string) =>
            set((state) => ({
                entries: state.entries.map((e) =>
                    e.id === entryId ? { ...e, enabled: !e.enabled, updatedAt: new Date() } : e
                ),
            })),

        pinEntry: (entryId: string) =>
            set((state) => ({
                entries: state.entries.map((e) =>
                    e.id === entryId ? { ...e, pinned: true, updatedAt: new Date() } : e
                ),
            })),

        unpinEntry: (entryId: string) =>
            set((state) => ({
                entries: state.entries.map((e) =>
                    e.id === entryId ? { ...e, pinned: false, updatedAt: new Date() } : e
                ),
            })),

        clearEntries: () => set({ entries: [] }),
    };
}

// ---------------------------------------------------------------------------
// Document group actions
// ---------------------------------------------------------------------------

function createKBDocumentActions(set: SetFn, get: GetFn) {
    return {
        toggleDocumentGroup: (parentId: string) => {
            const parent = get().entries.find((e) => e.id === parentId);
            if (!parent) return;
            const newEnabled = !parent.enabled;
            set((state) => ({
                entries: state.entries.map((e) => {
                    if (e.id === parentId || e.parentEntryId === parentId) {
                        return { ...e, enabled: newEnabled, updatedAt: new Date() };
                    }
                    return e;
                }),
            }));
        },

        removeDocumentGroup: (parentId: string) =>
            set((state) => ({
                entries: state.entries.filter(
                    (e) => e.id !== parentId && e.parentEntryId !== parentId
                ),
            })),

        getDocumentCount: () => get().entries.filter((e) => !e.parentEntryId).length,

        /** @deprecated Use getDocumentCount — entry count includes chunks. */
        getEntryCount: () => get().entries.length,

        getPinnedEntries: () => get().entries.filter((e) => e.enabled && e.pinned === true),
    };
}

// ---------------------------------------------------------------------------
// Query actions
// ---------------------------------------------------------------------------

function createKBQueryActions(get: GetFn) {
    return {
        getEnabledEntries: () => get().entries.filter((e) => e.enabled),

        getFilteredEntries: () => {
            const { entries, searchQuery, typeFilter, selectedTag } = get();
            return filterEntries(entries, searchQuery, typeFilter, selectedTag);
        },

        getAllTags: () => extractAllTags(get().entries),
    };
}

// ---------------------------------------------------------------------------
// UI state actions
// ---------------------------------------------------------------------------

function createKBUIActions(set: SetFn) {
    return {
        setPanelOpen: (isPanelOpen: boolean) => set({ isPanelOpen }),

        setSearchQuery: (searchQuery: string) => set({ searchQuery }),

        setTypeFilter: (typeFilter: KBTypeFilter) => set({ typeFilter }),

        setSelectedTag: (selectedTag: string | null) => set({ selectedTag }),

        setSummarizingEntryIds: (summarizingEntryIds: string[]) => set({ summarizingEntryIds }),

        removeSummarizingEntryId: (id: string) =>
            set((state) => ({
                summarizingEntryIds: state.summarizingEntryIds.filter((eid) => eid !== id),
            })),
    };
}

// ---------------------------------------------------------------------------
// Store composition
// ---------------------------------------------------------------------------

export const useKnowledgeBankStore = create<KnowledgeBankStore>()((set, get) => ({
    ...initialState,
    ...createKBEntryActions(set),
    ...createKBDocumentActions(set, get),
    ...createKBQueryActions(get),
    ...createKBUIActions(set),
}));

/** Pure filter logic — testable outside the store */
export function filterEntries(
    entries: KnowledgeBankEntry[],
    query: string,
    typeFilter: KBTypeFilter,
    selectedTag?: string | null
): KnowledgeBankEntry[] {
    let filtered = entries;

    if (typeFilter !== 'all') {
        filtered = filtered.filter((e) => e.type === typeFilter);
    }

    if (selectedTag) {
        filtered = filtered.filter((e) => e.tags?.includes(selectedTag));
    }

    if (query.trim()) {
        const lower = query.toLowerCase();
        filtered = filtered.filter((e) =>
            e.title.toLowerCase().includes(lower) ||
            e.content.toLowerCase().includes(lower) ||
            e.tags?.some((t) => t.toLowerCase().includes(lower))
        );
    }

    return filtered;
}

/** Extract all unique tags from entries, sorted alphabetically */
export function extractAllTags(entries: KnowledgeBankEntry[]): string[] {
    const tagSet = new Set<string>();
    for (const entry of entries) {
        if (entry.tags) {
            for (const tag of entry.tags) tagSet.add(tag);
        }
    }
    return [...tagSet].sort();
}
