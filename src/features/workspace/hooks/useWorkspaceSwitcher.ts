/**
 * useWorkspaceSwitcher - Atomic workspace switching with cache-first pattern
 */
import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { loadNodes, loadEdges, saveNodes, saveEdges } from '../services/workspaceService';
import { workspaceCache } from '../services/workspaceCache';
import { persistentCacheService } from '../services/persistentCacheService';
import { strings } from '@/shared/localization/strings';

interface UseWorkspaceSwitcherResult {
    isSwitching: boolean;
    error: string | null;
    switchWorkspace: (workspaceId: string) => Promise<void>;
}

export function useWorkspaceSwitcher(): UseWorkspaceSwitcherResult {
    const { user } = useAuthStore();
    const { setNodes, setEdges } = useCanvasStore();
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const setCurrentWorkspaceId = useWorkspaceStore((s) => s.setCurrentWorkspaceId);
    const isSwitching = useWorkspaceStore((s) => s.isSwitching);
    const setSwitching = useWorkspaceStore((s) => s.setSwitching);
    
    const [error, setError] = useState<string | null>(null);
    const switchingRef = useRef(false);

    const switchWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
        // Guard: same workspace or no user
        if (workspaceId === currentWorkspaceId || !user) {
            return;
        }

        // Guard: prevent concurrent switches
        if (switchingRef.current) {
            return;
        }

        switchingRef.current = true;
        setSwitching(true);
        setError(null);
        const startTime = performance.now();

        try {
            // 1. Fire-and-forget save (non-blocking, parallel with load)
            const { nodes: currentNodes, edges: currentEdges } = useCanvasStore.getState();
            if (currentWorkspaceId && (currentNodes.length > 0 || currentEdges.length > 0)) {
                // Don't await - save happens in background while we load new workspace
                void Promise.all([
                    saveNodes(user.id, currentWorkspaceId, currentNodes),
                    saveEdges(user.id, currentWorkspaceId, currentEdges),
                ]).catch((err: unknown) => console.error('[useWorkspaceSwitcher] Background save failed:', err));
            }

            // 2. Check cache first (instant if cached)
            const cached = workspaceCache.get(workspaceId);
            let newNodes;
            let newEdges;
            let cacheHit = false;

            if (cached) {
                // Cache hit - instant!
                cacheHit = true;
                newNodes = cached.nodes;
                newEdges = cached.edges;
            } else {
                // Cache miss - load from Firestore
                [newNodes, newEdges] = await Promise.all([
                    loadNodes(user.id, workspaceId),
                    loadEdges(user.id, workspaceId),
                ]);
                // Populate cache for next time (writes through to persistent)
                workspaceCache.set(workspaceId, { nodes: newNodes, edges: newEdges, loadedAt: Date.now() });

                // Update persistent metadata with this workspace
                const existingMeta = persistentCacheService.getWorkspaceMetadata();
                if (!existingMeta.some((m) => m.id === workspaceId)) {
                    existingMeta.push({ id: workspaceId, name: workspaceId, updatedAt: Date.now() });
                    persistentCacheService.setWorkspaceMetadata(existingMeta);
                }
            }
            const loadTime = performance.now() - startTime;
            console.log(`[WorkspaceSwitcher] Switch completed in ${loadTime.toFixed(2)}ms (cache ${cacheHit ? 'HIT' : 'MISS'})`);

            // 3. Atomic swap: update nodes/edges directly (no clearCanvas)
            setNodes(newNodes);
            setEdges(newEdges);

            // 4. Update workspace ID last
            setCurrentWorkspaceId(workspaceId);
        } catch (err) {
            const message = err instanceof Error ? err.message : strings.workspace.switchError;
            setError(message);
            console.error('[useWorkspaceSwitcher]', err);
        } finally {
            setSwitching(false);
            switchingRef.current = false;
        }
    }, [user, currentWorkspaceId, setNodes, setEdges, setCurrentWorkspaceId, setSwitching]);

    return { isSwitching, error, switchWorkspace };
}
