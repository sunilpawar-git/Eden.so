import { useState, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '../stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { deleteWorkspace } from '../services/workspaceService';
import { TrashIcon } from '@/shared/components/icons';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { useConfirm } from '@/shared/stores/confirmStore';
import styles from './WorkspaceControls.module.css';

export function DeleteWorkspaceButton() {
    const { user } = useAuthStore();
    const { currentWorkspaceId, workspaces, removeWorkspace, setCurrentWorkspaceId } = useWorkspaceStore();
    const [isDeleting, setIsDeleting] = useState(false);
    const confirm = useConfirm();

    const handleDeleteWorkspace = useCallback(async () => {
        if (!user || !currentWorkspaceId || isDeleting) return;
        const userId = user.id;

        if (currentWorkspaceId === DEFAULT_WORKSPACE_ID) {
            toast.error(strings.workspace.deleteDefaultError);
            return;
        }

        const confirmed = await confirm({
            title: strings.workspace.deleteConfirmTitle,
            message: strings.workspace.deleteConfirm,
            confirmText: strings.workspace.deleteConfirmButton,
            isDestructive: true,
        });
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            await deleteWorkspace(userId, currentWorkspaceId);
            removeWorkspace(currentWorkspaceId);

            const remainingWorkspaces = workspaces.filter(ws => ws.id !== currentWorkspaceId);
            const nextWorkspace = remainingWorkspaces[0];
            if (nextWorkspace) {
                setCurrentWorkspaceId(nextWorkspace.id);
            } else {
                setCurrentWorkspaceId(DEFAULT_WORKSPACE_ID);
                useCanvasStore.getState().clearCanvas();
            }

            toast.success(strings.workspace.deleteSuccess);
        } catch (error) {
            console.error('[DeleteWorkspaceButton] Failed to delete workspace:', error);
            toast.error(strings.errors.generic);
        } finally {
            setIsDeleting(false);
        }
    }, [user, currentWorkspaceId, workspaces, removeWorkspace, setCurrentWorkspaceId, isDeleting, confirm]);

    return (
        <button
            className={`${styles.button} ${styles.deleteButton}`}
            onClick={handleDeleteWorkspace}
            disabled={isDeleting}
            title={strings.workspace.deleteWorkspaceTooltip}
        >
            <TrashIcon size={20} />
        </button>
    );
}
