/**
 * IDB Cache Service - IndexedDB-backed workspace data cache
 * Replaces localStorage-based persistentCacheService backend.
 * SOLID SRP: Only handles IDB read/write of workspace data.
 */
import { indexedDbService, IDB_STORES } from '@/shared/services/indexedDbService';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { serializeNodes, deserializeNodes } from './nodeSerializer';

export interface IdbCachedWorkspaceData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    loadedAt: number;
}

/** Serialized form stored in IndexedDB */
interface StoredWorkspaceData {
    nodes: ReturnType<typeof serializeNodes>;
    edges: CanvasEdge[];
    loadedAt: number;
}

const STORE = IDB_STORES.workspaceData;
const LRU_KEY = '__lru_order__';
const MAX_CACHED = 20;

async function getLruOrder(): Promise<string[]> {
    const order = await indexedDbService.get<string[]>(IDB_STORES.metadata, LRU_KEY);
    return order ?? [];
}

async function setLruOrder(order: string[]): Promise<void> {
    await indexedDbService.put(IDB_STORES.metadata, LRU_KEY, order);
}

async function touchLru(workspaceId: string): Promise<void> {
    const order = (await getLruOrder()).filter((id) => id !== workspaceId);
    order.push(workspaceId);

    // Evict oldest beyond limit
    while (order.length > MAX_CACHED) {
        const evicted = order.shift();
        if (evicted) {
            await indexedDbService.del(STORE, evicted);
        }
    }

    await setLruOrder(order);
}

async function getWorkspaceData(workspaceId: string): Promise<IdbCachedWorkspaceData | null> {
    const stored = await indexedDbService.get<StoredWorkspaceData>(STORE, workspaceId);
    if (!stored) return null;

    return {
        nodes: deserializeNodes(stored.nodes),
        edges: stored.edges,
        loadedAt: stored.loadedAt,
    };
}

async function setWorkspaceData(
    workspaceId: string,
    data: IdbCachedWorkspaceData
): Promise<boolean> {
    const stored: StoredWorkspaceData = {
        nodes: serializeNodes(data.nodes),
        edges: data.edges,
        loadedAt: data.loadedAt,
    };
    const success = await indexedDbService.put(STORE, workspaceId, stored);
    if (success) {
        await touchLru(workspaceId);
    }
    return success;
}

async function removeWorkspaceData(workspaceId: string): Promise<boolean> {
    const success = await indexedDbService.del(STORE, workspaceId);
    if (success) {
        const order = (await getLruOrder()).filter((id) => id !== workspaceId);
        await setLruOrder(order);
    }
    return success;
}

async function clear(): Promise<boolean> {
    const storeCleared = await indexedDbService.clear(STORE);
    await indexedDbService.del(IDB_STORES.metadata, LRU_KEY);
    return storeCleared;
}

export const idbCacheService = {
    getWorkspaceData,
    setWorkspaceData,
    removeWorkspaceData,
    clear,
    getLruOrder,
};
