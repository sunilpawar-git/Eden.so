/**
 * Knowledge Bank Store — ViewModel for KB state
 * Manages entries, loading state, and panel visibility
 */
import { create } from 'zustand';
import type {
    KnowledgeBankEntry,
    KnowledgeBankState,
    KnowledgeBankActions,
} from '../types/knowledgeBank';

type KnowledgeBankStore = KnowledgeBankState & KnowledgeBankActions;

const initialState: KnowledgeBankState = {
    entries: [],
    isPanelOpen: false,
};

export const useKnowledgeBankStore = create<KnowledgeBankStore>()((set, get) => ({
    ...initialState,

    setEntries: (entries: KnowledgeBankEntry[]) => {
        set({ entries });
    },

    addEntry: (entry: KnowledgeBankEntry) => {
        set((state) => ({ entries: [...state.entries, entry] }));
    },

    updateEntry: (entryId: string, updates: Partial<KnowledgeBankEntry>) => {
        set((state) => ({
            entries: state.entries.map((e) =>
                e.id === entryId ? { ...e, ...updates, updatedAt: new Date() } : e
            ),
        }));
    },

    removeEntry: (entryId: string) => {
        set((state) => ({
            entries: state.entries.filter((e) => e.id !== entryId),
        }));
    },

    toggleEntry: (entryId: string) => {
        set((state) => ({
            entries: state.entries.map((e) =>
                e.id === entryId ? { ...e, enabled: !e.enabled, updatedAt: new Date() } : e
            ),
        }));
    },

    clearEntries: () => {
        set({ entries: [] });
    },

    setPanelOpen: (isPanelOpen: boolean) => {
        set({ isPanelOpen });
    },

    getEnabledEntries: () => {
        return get().entries.filter((e) => e.enabled);
    },

    getEntryCount: () => {
        return get().entries.length;
    },
}));
