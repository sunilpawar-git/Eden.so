/**
 * useWorkspaceSwitcher - Atomic workspace switching with prefetch-then-swap
 */
import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { loadNodes, loadEdges, saveNodes, saveEdges } from '../services/workspaceService';
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
    
    const [isSwitching, setIsSwitching] = useState(false);
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
        setIsSwitching(true);
        setError(null);

        try {
            // 1. Save current workspace data (if exists)
            const { nodes: currentNodes, edges: currentEdges } = useCanvasStore.getState();
            if (currentWorkspaceId && (currentNodes.length > 0 || currentEdges.length > 0)) {
                await Promise.all([
                    saveNodes(user.id, currentWorkspaceId, currentNodes),
                    saveEdges(user.id, currentWorkspaceId, currentEdges),
                ]);
            }

            // 2. Prefetch new workspace data (before updating any state)
            const [newNodes, newEdges] = await Promise.all([
                loadNodes(user.id, workspaceId),
                loadEdges(user.id, workspaceId),
            ]);

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
            setIsSwitching(false);
            switchingRef.current = false;
        }
    }, [user, currentWorkspaceId, setNodes, setEdges, setCurrentWorkspaceId]);

    return { isSwitching, error, switchWorkspace };
}
