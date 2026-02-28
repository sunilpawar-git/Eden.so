/**
 * useWorkspaceOperations Hook - Handles creation, deletion, renaming and reordering
 */
import { useState, useCallback } from 'react';
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

export function useWorkspaceOperations() {
    const user = useAuthStore((s) => s.user);
    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const workspaces = useWorkspaceStore((s) => s.workspaces);
    const { switchWorkspace } = useWorkspaceSwitcher();

    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingDivider, setIsCreatingDivider] = useState(false);

    const handleNewWorkspace = useCallback(async () => {
        if (!user || isCreating) return;
        setIsCreating(true);
        try {
            const { nodes, edges } = useCanvasStore.getState();
            if (currentWorkspaceId && (nodes.length > 0 || edges.length > 0)) {
                useOfflineQueueStore.getState().queueSave(user.id, currentWorkspaceId, nodes, edges);
                useWorkspaceStore.getState().setNodeCount(currentWorkspaceId, nodes.length);
            }
            const workspace = await createNewWorkspace(user.id);
            // Use getState() for actions - stable references, no re-render dependency
            useWorkspaceStore.getState().addWorkspace({ ...workspace, nodeCount: 0 });
            useWorkspaceStore.getState().setCurrentWorkspaceId(workspace.id);
            useCanvasStore.getState().clearCanvas();
            toast.success(`${strings.workspace.created}: ${workspace.name}`);
        } catch (error) {
            console.error('[Sidebar] Failed to create workspace:', error);
            toast.error(strings.errors.generic);
        } finally { setIsCreating(false); }
    }, [user, currentWorkspaceId, isCreating]);

    const handleNewDivider = useCallback(async () => {
        if (!user || isCreatingDivider) return;
        setIsCreatingDivider(true);
        try {
            const newDivider = await createNewDividerWorkspace(user.id);
            if (currentWorkspaceId) {
                const { workspaces: currentList } = useWorkspaceStore.getState();
                const targetIndex = currentList.findIndex(ws => ws.id === currentWorkspaceId);
                useWorkspaceStore.getState().insertWorkspaceAfter(newDivider, currentWorkspaceId);
                const { workspaces: updatedList } = useWorkspaceStore.getState();
                const updates = updatedList.map((ws, i) => ({ id: ws.id, orderIndex: i }));
                await Promise.all([saveWorkspace(user.id, { ...newDivider, orderIndex: targetIndex + 1 }), updateWorkspaceOrder(user.id, updates)]);
            } else { useWorkspaceStore.getState().addWorkspace(newDivider); }
            toast.success(strings.workspace.addDivider);
        } catch (error) {
            console.error('[Sidebar] Failed to create divider:', error);
            toast.error(strings.errors.generic);
        } finally { setIsCreatingDivider(false); }
    }, [user, currentWorkspaceId, isCreatingDivider]);

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
