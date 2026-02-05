/**
 * WorkspaceCache Service
 * In-memory cache for instant workspace switching
 * SOLID: Single Responsibility - only handles caching
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { loadNodes, loadEdges } from './workspaceService';

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
}

const cache = new Map<string, WorkspaceData>();

function get(workspaceId: string): WorkspaceData | null {
    return cache.get(workspaceId) ?? null;
}

function set(workspaceId: string, data: WorkspaceData): void {
    cache.set(workspaceId, data);
}

function update(workspaceId: string, nodes: CanvasNode[], edges: CanvasEdge[]): void {
    // Update cache with fresh data (called after autosave)
    set(workspaceId, { nodes, edges, loadedAt: Date.now() });
}

function invalidate(workspaceId: string): void {
    cache.delete(workspaceId);
}

function clear(): void {
    cache.clear();
}

function has(workspaceId: string): boolean {
    return cache.has(workspaceId);
}

async function preload(userId: string, workspaceIds: string[]): Promise<void> {
    // Filter out already cached workspaces
    const toLoad = workspaceIds.filter((id) => !has(id));

    // Load all uncached workspaces in parallel
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
};
