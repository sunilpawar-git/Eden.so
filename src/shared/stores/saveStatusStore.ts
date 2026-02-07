/**
 * Save Status Store - Tracks save lifecycle state
 * SSOT for autosave status across the application
 */
import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'queued';

interface SaveStatusState {
    status: SaveStatus;
    lastSavedAt: number | null;
    lastError: string | null;
}

interface SaveStatusActions {
    setSaving: () => void;
    setSaved: () => void;
    setError: (message: string) => void;
    setQueued: () => void;
    setIdle: () => void;
}

type SaveStatusStore = SaveStatusState & SaveStatusActions;

export const useSaveStatusStore = create<SaveStatusStore>()((set) => ({
    status: 'idle',
    lastSavedAt: null,
    lastError: null,

    setSaving: () => set({ status: 'saving', lastError: null }),
    setSaved: () => set({ status: 'saved', lastSavedAt: Date.now(), lastError: null }),
    setError: (message: string) => set({ status: 'error', lastError: message }),
    setQueued: () => set({ status: 'queued' }),
    setIdle: () => set({ status: 'idle' }),
}));
