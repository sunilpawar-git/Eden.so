/**
 * WorkspaceCache Service
 * In-memory cache for instant workspace switching.
 * Persistent layer uses IndexedDB via idbCacheService.
 * SOLID: Single Responsibility - only handles caching.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { loadNodes, loadEdges } from './workspaceService';
import { idbCacheService } from './idbCacheService';

export interface WorkspaceData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    loadedAt: number;
}

interface WorkspaceCacheService {
    get(workspaceId: string): WorkspaceData | null;
    set(workspaceId: string, data: WorkspaceData): void;
    update(workspaceId: string, nodes: CanvasNode[], edges: CanvasEdge[]): void;
    invalidate(workspaceId: string): void;
    clear(): void;
    preload(userId: string, workspaceIds: string[]): Promise<void>;
    has(workspaceId: string): boolean;
    hydrateFromIdb(): Promise<void>;
}

const cache = new Map<string, WorkspaceData>();

/** Synchronous read from in-memory cache only */
function get(workspaceId: string): WorkspaceData | null {
    return cache.get(workspaceId) ?? null;
}

/** Write to in-memory cache + async write-through to IDB */
function set(workspaceId: string, data: WorkspaceData): void {
    cache.set(workspaceId, data);
    void idbCacheService.setWorkspaceData(workspaceId, data);
}

function update(workspaceId: string, nodes: CanvasNode[], edges: CanvasEdge[]): void {
    set(workspaceId, { nodes, edges, loadedAt: Date.now() });
}

function invalidate(workspaceId: string): void {
    cache.delete(workspaceId);
    void idbCacheService.removeWorkspaceData(workspaceId);
}

function clear(): void {
    cache.clear();
    void idbCacheService.clear();
}

function has(workspaceId: string): boolean {
    return cache.has(workspaceId);
}

/** Load all IDB-persisted workspace data into in-memory cache (call at startup) */
async function hydrateFromIdb(): Promise<void> {
    try {
        const order = await idbCacheService.getLruOrder();
        for (const id of order) {
            if (cache.has(id)) continue;
            const data = await idbCacheService.getWorkspaceData(id);
            if (data) {
                cache.set(id, data);
            }
        }
    } catch {
        // Best effort — app works fine with empty cache
    }
}

async function preload(userId: string, workspaceIds: string[]): Promise<void> {
    const toLoad = workspaceIds.filter((id) => !has(id));

    await Promise.all(
        toLoad.map(async (workspaceId) => {
            try {
                const [nodes, edges] = await Promise.all([
                    loadNodes(userId, workspaceId),
                    loadEdges(userId, workspaceId),
                ]);
                set(workspaceId, { nodes, edges, loadedAt: Date.now() });
            } catch (err) {
                console.warn(`[WorkspaceCache] Failed to preload ${workspaceId}:`, err);
            }
        })
    );
}

export const workspaceCache: WorkspaceCacheService = {
    get,
    set,
    update,
    invalidate,
    clear,
    preload,
    has,
    hydrateFromIdb,
};
