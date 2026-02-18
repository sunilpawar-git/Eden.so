/**
 * useWorkspaceLoader - Cache-first workspace loading
 * Loads from cache instantly, background-refreshes from Firestore when online.
 * Falls back to Firestore on cache miss. Shows error when offline + no cache.
 */
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { loadNodes, loadEdges } from '../services/workspaceService';
import { workspaceCache } from '../services/workspaceCache';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { strings } from '@/shared/localization/strings';

interface UseWorkspaceLoaderResult {
    isLoading: boolean;
    error: string | null;
    hasOfflineData: boolean;
}

type UpdateCallback = (nodes: CanvasNode[], edges: CanvasEdge[]) => void;

/** Background-refresh from Firestore, merging into cache */
async function backgroundRefresh(
    userId: string,
    workspaceId: string,
    onUpdate: UpdateCallback
): Promise<void> {
    if (!useNetworkStatusStore.getState().isOnline) return;

    try {
        const [freshNodes, freshEdges] = await Promise.all([
            loadNodes(userId, workspaceId),
            loadEdges(userId, workspaceId),
        ]);

        onUpdate(freshNodes, freshEdges);
        workspaceCache.set(workspaceId, {
            nodes: freshNodes,
            edges: freshEdges,
            loadedAt: Date.now(),
        });
    } catch (err) {
        console.warn('[useWorkspaceLoader] Background refresh failed:', err);
    }
}

/** Load workspace from Firestore on cache miss */
async function loadFromFirestore(
    userId: string,
    workspaceId: string,
    onUpdate: UpdateCallback
): Promise<void> {
    const [nodes, edges] = await Promise.all([
        loadNodes(userId, workspaceId),
        loadEdges(userId, workspaceId),
    ]);
    onUpdate(nodes, edges);
    workspaceCache.set(workspaceId, { nodes, edges, loadedAt: Date.now() });
}

export function useWorkspaceLoader(workspaceId: string): UseWorkspaceLoaderResult {
    const { user } = useAuthStore();
    const { setNodes, setEdges } = useCanvasStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasOfflineData, setHasOfflineData] = useState(false);

    useEffect(() => {
        if (!user || !workspaceId) {
            setIsLoading(false);
            return;
        }

        const userId = user.id;
        let mounted = true;

        const applyIfMounted: UpdateCallback = (nodes, edges) => {
            if (mounted) {
                setNodes(nodes);
                setEdges(edges);
            }
        };

        async function load() {
            setIsLoading(true);
            setError(null);

            // 1. Try cache first (in-memory -> IndexedDB)
            const cached = workspaceCache.get(workspaceId);
            if (mounted) setHasOfflineData(cached != null);

            if (cached) {
                applyIfMounted(cached.nodes, cached.edges);
                if (mounted) setIsLoading(false);
                await backgroundRefresh(userId, workspaceId, applyIfMounted);
                return;
            }

            // 2. Cache miss — check if online before Firestore call
            const isOnline = useNetworkStatusStore.getState().isOnline;
            if (!isOnline) {
                // Offline + no cache = fail fast
                if (mounted) {
                    setError(strings.offline.noOfflineData);
                    setIsLoading(false);
                }
                return;
            }

            // 3. Load from Firestore (online)
            try {
                await loadFromFirestore(userId, workspaceId, applyIfMounted);
            } catch (err) {
                if (mounted) {
                    const message = err instanceof Error
                        ? err.message
                        : strings.offline.noOfflineData;
                    setError(message);
                    console.error('[useWorkspaceLoader]', err);
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        void load();

        // Load Knowledge Bank entries (non-blocking, mirrors useWorkspaceSwitcher pattern)
        void (async () => {
            try {
                const { loadKBEntries } = await import('@/features/knowledgeBank/services/knowledgeBankService');
                const { useKnowledgeBankStore } = await import('@/features/knowledgeBank/stores/knowledgeBankStore');
                const kbEntries = await loadKBEntries(userId, workspaceId);
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (mounted) {
                    useKnowledgeBankStore.getState().setEntries(kbEntries);
                }
            } catch (err: unknown) {
                console.error('[useWorkspaceLoader] KB load failed:', err);
            }
        })();

        return () => { mounted = false; };
    }, [user, workspaceId, setNodes, setEdges]);

    return { isLoading, error, hasOfflineData };
}
