/**
 * useWorkspaceLoader - Cache-first workspace loading
 * Loads from cache instantly, background-refreshes from Firestore when online.
 * Falls back to Firestore on cache miss. Shows error when offline + no cache.
 */
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { loadNodes, loadEdges } from '../services/workspaceService';
import { workspaceCache } from '../services/workspaceCache';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { strings } from '@/shared/localization/strings';

interface UseWorkspaceLoaderResult {
    isLoading: boolean;
    error: string | null;
}

export function useWorkspaceLoader(workspaceId: string): UseWorkspaceLoaderResult {
    const { user } = useAuthStore();
    const { setNodes, setEdges } = useCanvasStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !workspaceId) {
            setIsLoading(false);
            return;
        }

        const userId = user.id;
        let mounted = true;

        async function load() {
            setIsLoading(true);
            setError(null);

            // 1. Try cache first (in-memory → persistent localStorage)
            const cached = workspaceCache.get(workspaceId);

            if (cached) {
                // Cache hit — instant load
                if (mounted) {
                    setNodes(cached.nodes);
                    setEdges(cached.edges);
                    setIsLoading(false);
                }

                // Background refresh from Firestore when online
                const isOnline = useNetworkStatusStore.getState().isOnline;
                if (isOnline) {
                    try {
                        const [freshNodes, freshEdges] = await Promise.all([
                            loadNodes(userId, workspaceId),
                            loadEdges(userId, workspaceId),
                        ]);
                        if (mounted) {
                            setNodes(freshNodes);
                            setEdges(freshEdges);
                            workspaceCache.set(workspaceId, {
                                nodes: freshNodes,
                                edges: freshEdges,
                                loadedAt: Date.now(),
                            });
                        }
                    } catch (err) {
                        // Background refresh failure is non-critical
                        console.warn('[useWorkspaceLoader] Background refresh failed:', err);
                    }
                }
                return;
            }

            // 2. Cache miss — load from Firestore
            try {
                const [nodes, edges] = await Promise.all([
                    loadNodes(userId, workspaceId),
                    loadEdges(userId, workspaceId),
                ]);
                if (mounted) {
                    setNodes(nodes);
                    setEdges(edges);
                    workspaceCache.set(workspaceId, {
                        nodes,
                        edges,
                        loadedAt: Date.now(),
                    });
                }
            } catch (err) {
                if (mounted) {
                    const message = err instanceof Error
                        ? err.message
                        : strings.offline.noOfflineData;
                    setError(message);
                    console.error('[useWorkspaceLoader]', err);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [user, workspaceId, setNodes, setEdges]);

    return { isLoading, error };
}
