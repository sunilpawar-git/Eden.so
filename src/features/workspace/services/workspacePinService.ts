/**
 * Workspace Pin Service - Manages pinned (offline-available) workspaces
 * SOLID SRP: Only handles pin/unpin persistence via IndexedDB
 */
import { indexedDbService, IDB_STORES } from '@/shared/services/indexedDbService';

const STORE = IDB_STORES.pinnedWorkspaces;
const PIN_LIST_KEY = '__pinned_ids__';

export interface PinnedWorkspaceEntry {
    workspaceId: string;
    pinnedAt: number;
}

async function getPinnedIds(): Promise<string[]> {
    const ids = await indexedDbService.get<string[]>(STORE, PIN_LIST_KEY);
    return ids ?? [];
}

async function isPinned(workspaceId: string): Promise<boolean> {
    const ids = await getPinnedIds();
    return ids.includes(workspaceId);
}

async function pin(workspaceId: string): Promise<boolean> {
    const ids = await getPinnedIds();
    if (ids.includes(workspaceId)) return true;

    const entry: PinnedWorkspaceEntry = {
        workspaceId,
        pinnedAt: Date.now(),
    };
    const saved = await indexedDbService.put(STORE, workspaceId, entry);
    if (saved) {
        ids.push(workspaceId);
        await indexedDbService.put(STORE, PIN_LIST_KEY, ids);
    }
    return saved;
}

async function unpin(workspaceId: string): Promise<boolean> {
    const deleted = await indexedDbService.del(STORE, workspaceId);
    if (deleted) {
        const ids = (await getPinnedIds()).filter((id) => id !== workspaceId);
        await indexedDbService.put(STORE, PIN_LIST_KEY, ids);
    }
    return deleted;
}

async function clear(): Promise<boolean> {
    return indexedDbService.clear(STORE);
}

export const workspacePinService = {
    getPinnedIds,
    isPinned,
    pin,
    unpin,
    clear,
};
