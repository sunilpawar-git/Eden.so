/**
 * useWorkspaceOperations Hook - Handles creation, deletion, renaming and reordering
 */
import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import {
    createNewWorkspace, createNewDividerWorkspace,
    saveWorkspace, updateWorkspaceOrder
} from '@/features/workspace/services/workspaceService';
import { useOfflineQueueStore } from '@/features/workspace/stores/offlineQueueStore';
import { logger } from '@/shared/services/logger';

export function useWorkspaceOperations() {
    const user = useAuthStore((s) => s.user);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const { switchWorkspace } = useWorkspaceSwitcher();

    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingDivider, setIsCreatingDivider] = useState(false);
    const userRef = useRef(user);
    const currentIdRef = useRef(currentWorkspaceId);
    userRef.current = user;
    currentIdRef.current = currentWorkspaceId;

    const handleNewWorkspace = useCallback(async () => {
        const currentUser = userRef.current;
        if (!currentUser || isCreating) return;
        setIsCreating(true);
        try {
            const curId = currentIdRef.current;
            const { nodes, edges } = useCanvasStore.getState();
            if (curId && (nodes.length > 0 || edges.length > 0)) {
                useOfflineQueueStore.getState().queueSave(currentUser.id, curId, nodes, edges);
                useWorkspaceStore.getState().setNodeCount(curId, nodes.length);
            }
            const workspace = await createNewWorkspace(currentUser.id);
            useWorkspaceStore.getState().addWorkspace({ ...workspace, nodeCount: 0 });
            useWorkspaceStore.getState().setCurrentWorkspaceId(workspace.id);
            useCanvasStore.getState().clearCanvas();
            toast.success(`${strings.workspace.created}: ${workspace.name}`);
        } catch (error) {
            logger.error('[Sidebar] Failed to create workspace:', error);
            toast.error(strings.errors.generic);
        } finally { setIsCreating(false); }
    }, [isCreating]); // stable — user/currentId read via refs

    const handleNewDivider = useCallback(async () => {
        const currentUser = userRef.current;
        if (!currentUser || isCreatingDivider) return;
        setIsCreatingDivider(true);
        try {
            const curId = currentIdRef.current;
            const newDivider = await createNewDividerWorkspace(currentUser.id);
            if (curId) {
                useWorkspaceStore.getState().insertWorkspaceAfter(newDivider, curId);
                const updatedList = useWorkspaceStore.getState().workspaces;
                const insertedIndex = updatedList.findIndex(ws => ws.id === newDivider.id);
                if (insertedIndex === -1) {
                    logger.warn('[useWorkspaceOperations] Divider not found in updated list after insert');
                }
                const orderIndex = insertedIndex >= 0 ? insertedIndex : updatedList.length - 1;
                const updates = updatedList.map((ws, i) => ({ id: ws.id, orderIndex: i }));
                await Promise.all([
                    saveWorkspace(currentUser.id, { ...newDivider, orderIndex }),
                    updateWorkspaceOrder(currentUser.id, updates),
                ]);
            } else { useWorkspaceStore.getState().addWorkspace(newDivider); }
            toast.success(strings.workspace.addDivider);
        } catch (error) {
            logger.error('[Sidebar] Failed to create divider:', error);
            toast.error(strings.errors.generic);
        } finally { setIsCreatingDivider(false); }
    }, [isCreatingDivider]); // stable — user/currentId read via refs

    return {
        isCreating,
        isCreatingDivider,
        handleNewWorkspace,
        handleNewDivider,
        workspaces,
        currentWorkspaceId,
        // Expose actions via getState() wrapper for consumers that need them
        updateWorkspace: useWorkspaceStore.getState().updateWorkspace,
        reorderWorkspaces: useWorkspaceStore.getState().reorderWorkspaces,
        removeWorkspace: useWorkspaceStore.getState().removeWorkspace,
        switchWorkspace,
        user,
    };
}
