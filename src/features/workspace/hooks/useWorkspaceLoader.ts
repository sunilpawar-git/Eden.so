/**
 * useWorkspaceLoader - Cache-first workspace loading
 * Loads from cache instantly, background-refreshes from Firestore when online.
 * Falls back to Firestore on cache miss. Shows error when offline + no cache.
 *
 * Background refresh uses two-layer merge (editingNodeId guard + timestamp)
 * to prevent overwriting local edits. @see mergeNodes.ts
 */
import { useState, useEffect } from 'react';
import type { Viewport } from '@xyflow/react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore, EMPTY_SELECTED_IDS } from '@/features/canvas/stores/canvasStore';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { loadNodes, loadEdges } from '../services/workspaceService';
import { workspaceCache } from '../services/workspaceCache';
import { mergeNodes, mergeEdges } from '../services/mergeNodes';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { strings } from '@/shared/localization/strings';

interface UseWorkspaceLoaderResult {
    isLoading: boolean;
    error: string | null;
    hasOfflineData: boolean;
}

type UpdateCallback = (nodes: CanvasNode[], edges: CanvasEdge[], viewport?: Viewport) => void;
type MergeCallback = (freshNodes: CanvasNode[], freshEdges: CanvasEdge[]) => void;

const DEFAULT_VIEWPORT: Viewport = { x: 32, y: 32, zoom: 1 };

/** Background-refresh from Firestore, merging with local state */
async function backgroundRefresh(
    userId: string,
    workspaceId: string,
    onMerge: MergeCallback
): Promise<void> {
    if (!useNetworkStatusStore.getState().isOnline) return;

    try {
        const [freshNodes, freshEdges] = await Promise.all([
            loadNodes(userId, workspaceId),
            loadEdges(userId, workspaceId),
        ]);

        onMerge(freshNodes, freshEdges);
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
    onUpdate(nodes, edges, DEFAULT_VIEWPORT);
    workspaceCache.set(workspaceId, { nodes, edges, viewport: DEFAULT_VIEWPORT, loadedAt: Date.now() });
}

export function useWorkspaceLoader(workspaceId: string): UseWorkspaceLoaderResult {
    const user = useAuthStore((s) => s.user);
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

        const applyIfMounted: UpdateCallback = (nodes, edges, viewport) => {
            if (!mounted) return;
            const current = useCanvasStore.getState();
            const newViewport = viewport ?? DEFAULT_VIEWPORT;

            // Skip update only if nodes, edges, AND viewport are identical
            if (
                current.nodes === nodes &&
                current.edges === edges &&
                current.viewport.x === newViewport.x &&
                current.viewport.y === newViewport.y &&
                current.viewport.zoom === newViewport.zoom
            ) {
                return;
            }

            useCanvasStore.setState({
                nodes,
                edges,
                selectedNodeIds: EMPTY_SELECTED_IDS as Set<string>,
                viewport: newViewport,
            });
        };

        const mergeIfMounted: MergeCallback = (freshNodes, freshEdges) => {
            if (!mounted) return;

            const state = useCanvasStore.getState();
            const mergedNodes = mergeNodes(state.nodes, freshNodes, state.editingNodeId);
            const mergedEdges = mergeEdges(state.edges, freshEdges);

            useCanvasStore.setState({ nodes: mergedNodes, edges: mergedEdges });
            workspaceCache.set(workspaceId, {
                nodes: mergedNodes,
                edges: mergedEdges,
                viewport: state.viewport,
                loadedAt: Date.now(),
            });
        };

        async function load() {
            setIsLoading(true);
            setError(null);

            // 1. Try cache first (in-memory -> IndexedDB)
            const cached = workspaceCache.get(workspaceId);
            if (mounted) setHasOfflineData(cached != null);

            if (cached) {
                applyIfMounted(cached.nodes, cached.edges, cached.viewport);
                if (mounted) setIsLoading(false);
                await backgroundRefresh(userId, workspaceId, mergeIfMounted);
                return;
            }

            // 2. Cache miss — check if online before Firestore call
            const isOnline = useNetworkStatusStore.getState().isOnline;
            if (!isOnline) {
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

        // Load Knowledge Bank entries (non-blocking)
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
    }, [user, workspaceId]);

    return { isLoading, error, hasOfflineData };
}
