/**
 * useSidebarWorkspaces Hook - Encapsulates workspace management logic for Sidebar
 * Split into smaller hooks to comply with function line limits.
 */
import { useCallback } from 'react';
import { toast } from '@/shared/stores/toastStore';
import { useConfirm } from '@/shared/stores/confirmStore';
import { strings } from '@/shared/localization/strings';
import { saveWorkspace, updateWorkspaceOrder, deleteWorkspace } from '@/features/workspace/services/workspaceService';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaceLoading } from './useWorkspaceLoading';
import { useWorkspaceOperations } from './useWorkspaceOperations';

export function useSidebarWorkspaces() {
    // 1. Initial loading logic
    useWorkspaceLoading();

    // 2. Core operations logic
    const {
        isCreating, isCreatingDivider, handleNewWorkspace, handleNewDivider,
        workspaces, currentWorkspaceId, updateWorkspace, reorderWorkspaces,
        removeWorkspace, switchWorkspace, user
    } = useWorkspaceOperations();

    const confirm = useConfirm();

    const handleDeleteDivider = useCallback(async (id: string) => {
        if (!user) return;
        if (await confirm({ title: strings.workspace.deleteDividerTitle, message: strings.workspace.deleteDividerMessage, confirmText: strings.workspace.deleteDividerButton, isDestructive: true })) {
            try {
                await deleteWorkspace(user.id, id);
                removeWorkspace(id);
            } catch (error) {
                console.error('[Sidebar] Failed to delete divider:', error);
                toast.error(strings.errors.generic);
            }
        }
    }, [user, confirm, removeWorkspace]);

    const handleSelectWorkspace = async (id: string) => {
        if (id === currentWorkspaceId) return;
        try { await switchWorkspace(id); }
        catch (error) {
            console.error('[Sidebar] Switch failed:', error);
            toast.error(strings.workspace.switchError);
        }
    };

    const handleRenameWorkspace = async (id: string, name: string) => {
        if (!user) return;
        const workspace = workspaces.find(ws => ws.id === id);
        if (!workspace) return;
        try {
            updateWorkspace(id, { name });
            await saveWorkspace(user.id, { ...workspace, name });
        } catch (error) {
            console.error('[Sidebar] Rename failed:', error);
            toast.error(strings.errors.generic);
        }
    };

    const handleReorderWorkspace = async (source: number, dest: number) => {
        if (!user || source === dest) return;
        reorderWorkspaces(source, dest);
        const { workspaces: updated } = useWorkspaceStore.getState();
        const updates = updated.map((ws, i) => ({ id: ws.id, orderIndex: i }));
        try { await updateWorkspaceOrder(user.id, updates); }
        catch (error) {
            console.error('[Sidebar] Reorder failed:', error);
            toast.error(strings.errors.generic);
        }
    };

    return {
        workspaces,
        currentWorkspaceId,
        isCreating,
        isCreatingDivider,
        handleNewWorkspace,
        handleNewDivider,
        handleDeleteDivider,
        handleSelectWorkspace,
        handleRenameWorkspace,
        handleReorderWorkspace,
    };
}
