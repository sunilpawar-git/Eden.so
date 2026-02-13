/**
 * Pinned Workspace Store - Reactive state for offline-pinned workspaces
 * SOLID SRP: Bridges workspacePinService with UI reactivity
 */
import { create } from 'zustand';
import { workspacePinService } from '../services/workspacePinService';
import { idbCacheService } from '../services/idbCacheService';
import { workspaceCache } from '../services/workspaceCache';

interface PinnedWorkspaceState {
    pinnedIds: string[];
    isLoading: boolean;
}

interface PinnedWorkspaceActions {
    loadPinnedIds: () => Promise<void>;
    pinWorkspace: (workspaceId: string) => Promise<boolean>;
    unpinWorkspace: (workspaceId: string) => Promise<boolean>;
    isPinned: (workspaceId: string) => boolean;
}

type PinnedWorkspaceStore = PinnedWorkspaceState & PinnedWorkspaceActions;

export const usePinnedWorkspaceStore = create<PinnedWorkspaceStore>()((set, get) => ({
    pinnedIds: [],
    isLoading: false,

    loadPinnedIds: async () => {
        set({ isLoading: true });
        try {
            const ids = await workspacePinService.getPinnedIds();
            set({ pinnedIds: ids });
        } finally {
            set({ isLoading: false });
        }
    },

    pinWorkspace: async (workspaceId: string) => {
        const success = await workspacePinService.pin(workspaceId);
        if (success) {
            // Cache workspace data in IDB for offline use
            const cached = workspaceCache.get(workspaceId);
            if (cached) {
                await idbCacheService.setWorkspaceData(workspaceId, cached);
            }
            set({ pinnedIds: [...get().pinnedIds, workspaceId] });
        }
        return success;
    },

    unpinWorkspace: async (workspaceId: string) => {
        const success = await workspacePinService.unpin(workspaceId);
        if (success) {
            await idbCacheService.removeWorkspaceData(workspaceId);
            set({ pinnedIds: get().pinnedIds.filter((id) => id !== workspaceId) });
        }
        return success;
    },

    isPinned: (workspaceId: string) => {
        return get().pinnedIds.includes(workspaceId);
    },
}));
