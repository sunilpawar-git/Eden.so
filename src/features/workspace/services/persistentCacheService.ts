/**
 * Persistent Cache Service - localStorage-backed workspace data cache
 * Survives browser refresh. LRU eviction at MAX_CACHED_WORKSPACES.
 * SOLID SRP: Only handles persistent caching of workspace data.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { serializeNodes, deserializeNodes } from './nodeSerializer';

const WORKSPACE_DATA_PREFIX = 'offline-workspace-';
const WORKSPACE_METADATA_KEY = 'offline-workspace-metadata';
const LRU_ORDER_KEY = 'offline-workspace-lru';
const MAX_CACHED_WORKSPACES = 20;

export interface CachedWorkspaceData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    loadedAt: number;
}

export interface WorkspaceMetadataEntry {
    id: string;
    name: string;
    updatedAt: number;
}

/** Serialized form stored in localStorage */
interface StoredWorkspaceData {
    nodes: ReturnType<typeof serializeNodes>;
    edges: CanvasEdge[];
    loadedAt: number;
}

function getLruOrder(): string[] {
    try {
        const raw = localStorage.getItem(LRU_ORDER_KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
}

function setLruOrder(order: string[]): void {
    try {
        localStorage.setItem(LRU_ORDER_KEY, JSON.stringify(order));
    } catch {
        // Quota exceeded — best effort
    }
}

function touchLru(workspaceId: string): void {
    const order = getLruOrder().filter((id) => id !== workspaceId);
    order.push(workspaceId);

    // Evict oldest entries beyond limit
    while (order.length > MAX_CACHED_WORKSPACES) {
        const evicted = order.shift();
        if (evicted) {
            try {
                localStorage.removeItem(`${WORKSPACE_DATA_PREFIX}${evicted}`);
            } catch {
                // best effort
            }
        }
    }

    setLruOrder(order);
}

function getWorkspaceData(workspaceId: string): CachedWorkspaceData | null {
    try {
        const raw = localStorage.getItem(`${WORKSPACE_DATA_PREFIX}${workspaceId}`);
        if (!raw) return null;

        const stored = JSON.parse(raw) as StoredWorkspaceData;
        return {
            nodes: deserializeNodes(stored.nodes),
            edges: stored.edges,
            loadedAt: stored.loadedAt,
        };
    } catch {
        return null;
    }
}

function setWorkspaceData(
    workspaceId: string,
    data: CachedWorkspaceData
): void {
    try {
        const stored: StoredWorkspaceData = {
            nodes: serializeNodes(data.nodes),
            edges: data.edges,
            loadedAt: data.loadedAt,
        };
        localStorage.setItem(
            `${WORKSPACE_DATA_PREFIX}${workspaceId}`,
            JSON.stringify(stored)
        );
        touchLru(workspaceId);
    } catch {
        // QuotaExceededError or other — best effort
    }
}

function removeWorkspaceData(workspaceId: string): void {
    try {
        localStorage.removeItem(`${WORKSPACE_DATA_PREFIX}${workspaceId}`);
        const order = getLruOrder().filter((id) => id !== workspaceId);
        setLruOrder(order);
    } catch {
        // best effort
    }
}

function getWorkspaceMetadata(): WorkspaceMetadataEntry[] {
    try {
        const raw = localStorage.getItem(WORKSPACE_METADATA_KEY);
        return raw ? (JSON.parse(raw) as WorkspaceMetadataEntry[]) : [];
    } catch {
        return [];
    }
}

function setWorkspaceMetadata(metadata: WorkspaceMetadataEntry[]): void {
    try {
        localStorage.setItem(WORKSPACE_METADATA_KEY, JSON.stringify(metadata));
    } catch {
        // best effort
    }
}

function clear(): void {
    try {
        const order = getLruOrder();
        for (const id of order) {
            localStorage.removeItem(`${WORKSPACE_DATA_PREFIX}${id}`);
        }
        localStorage.removeItem(LRU_ORDER_KEY);
        localStorage.removeItem(WORKSPACE_METADATA_KEY);
    } catch {
        // best effort
    }
}

export const persistentCacheService = {
    getWorkspaceData,
    setWorkspaceData,
    removeWorkspaceData,
    getWorkspaceMetadata,
    setWorkspaceMetadata,
    clear,
};
