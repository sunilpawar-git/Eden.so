/**
 * useAutosave Hook - Debounced autosave for canvas state
 */
import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { saveNodes, saveEdges } from '@/features/workspace/services/workspaceService';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';

const AUTOSAVE_DELAY_MS = 2000; // 2 second debounce

export function useAutosave(workspaceId: string) {
    const { nodes, edges } = useCanvasStore();
    const { user } = useAuthStore();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef({ nodes: '', edges: '' });

    const save = useCallback(async () => {
        if (!user || !workspaceId) return;

        try {
            await Promise.all([
                saveNodes(user.id, workspaceId, nodes),
                saveEdges(user.id, workspaceId, edges),
            ]);
            // Update cache with saved data to keep it fresh
            workspaceCache.update(workspaceId, nodes, edges);
            console.log('[Autosave] Saved successfully');
        } catch (error) {
            console.error('[Autosave] Failed:', error);
            // TODO: Show toast notification
        }
    }, [user, workspaceId, nodes, edges]);

    useEffect(() => {
        // Skip if no changes - only compare meaningful fields (exclude timestamps)
        const nodesJson = JSON.stringify(
            nodes.map((n) => ({
                id: n.id,
                workspaceId: n.workspaceId,
                type: n.type,
                position: n.position,
                data: n.data,
            }))
        );
        const edgesJson = JSON.stringify(edges);

        if (
            nodesJson === lastSavedRef.current.nodes &&
            edgesJson === lastSavedRef.current.edges
        ) {
            return;
        }

        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new debounced save
        timeoutRef.current = setTimeout(() => {
            lastSavedRef.current = { nodes: nodesJson, edges: edgesJson };
            save();
        }, AUTOSAVE_DELAY_MS);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [nodes, edges, save]);

    // NOTE: Removed "force save on unmount" effect.
    // Save-before-switch is now handled explicitly in Sidebar.tsx
    // to avoid race condition where clearCanvas() runs before cleanup.
}
