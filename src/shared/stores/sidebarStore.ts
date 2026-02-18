/**
 * Sidebar Store — Pin/unpin state for sidebar visibility mode
 * SSOT for sidebar collapse behaviour (pinned vs hover mode)
 */
import { create } from 'zustand';
import { getValidatedStorageItem, setStorageItem } from '@/shared/utils/storage';

const STORAGE_KEY = 'sidebar-isPinned';
const VALID_PIN_VALUES = ['true', 'false'] as const;

function readPinnedState(): boolean {
    const raw = getValidatedStorageItem(STORAGE_KEY, 'true', VALID_PIN_VALUES);
    return raw === 'true';
}

interface SidebarState {
    isPinned: boolean;
    isHoverOpen: boolean;
    togglePin: () => void;
    setHoverOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()((set, get) => ({
    isPinned: readPinnedState(),
    isHoverOpen: false,

    togglePin: () => {
        const newValue = !get().isPinned;
        set({ isPinned: newValue, isHoverOpen: false });
        setStorageItem(STORAGE_KEY, newValue);
    },

    setHoverOpen: (open: boolean) => {
        if (get().isPinned) return;
        set({ isHoverOpen: open });
    },
}));
