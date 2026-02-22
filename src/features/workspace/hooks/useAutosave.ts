/**
 * useAutosave Hook - Debounced autosave with offline queue support
 */
import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { saveNodes, saveEdges, saveWorkspace } from '@/features/workspace/services/workspaceService';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { useSaveStatusStore } from '@/shared/stores/saveStatusStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

const AUTOSAVE_DELAY_MS = 2000; // 2 second debounce


export function useAutosave(workspaceId: string, isWorkspaceLoading: boolean = false) {
    const { nodes, edges } = useCanvasStore();
    const { user } = useAuthStore();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef({ nodes: '', edges: '' });

    const save = useCallback(async () => {
        if (!user || !workspaceId) return;

        const isOnline = useNetworkStatusStore.getState().isOnline;

        // Offline: queue save for later
        if (!isOnline) {
            useOfflineQueueStore.getState().queueSave(user.id, workspaceId, nodes, edges);
            useSaveStatusStore.getState().setQueued();
            workspaceCache.update(workspaceId, nodes, edges);
            return;
        }

        // Online: save directly to Firestore
        const { setSaving, setSaved, setError } = useSaveStatusStore.getState();
        setSaving();

        try {
            const currentWorkspace = useWorkspaceStore.getState().workspaces.find((w) => w.id === workspaceId);

            await Promise.all([
                saveNodes(user.id, workspaceId, nodes),
                saveEdges(user.id, workspaceId, edges),
            ]);
            workspaceCache.update(workspaceId, nodes, edges);

            // Phase R1: Only update the workspace document in Firestore if the node count has actually changed
            const newNodeCount = nodes.length;
            if (currentWorkspace && currentWorkspace.nodeCount !== newNodeCount) {
                await saveWorkspace(user.id, { ...currentWorkspace, nodeCount: newNodeCount });
                useWorkspaceStore.getState().setNodeCount(workspaceId, newNodeCount);
            }

            setSaved();
        } catch (error) {
            const message = error instanceof Error ? error.message : strings.offline.saveError;
            setError(message);
            toast.error(strings.offline.saveFailed);
        }
    }, [user, workspaceId, nodes, edges]);

    useEffect(() => {
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

        // Phase R2: If the workspace is currently loading, absorb the state as our baseline
        // without triggering a save. This prevents a "mount save" tech debt trap.
        if (isWorkspaceLoading) {
            lastSavedRef.current = { nodes: nodesJson, edges: edgesJson };
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            lastSavedRef.current = { nodes: nodesJson, edges: edgesJson };
            void save();
        }, AUTOSAVE_DELAY_MS);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [nodes, edges, save, isWorkspaceLoading]);
}
