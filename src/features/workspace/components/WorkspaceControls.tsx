import { useState, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '../stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { deleteWorkspace } from '../services/workspaceService';
import { PlusIcon, TrashIcon, EraserIcon, GridIcon, FreeFlowIcon } from '@/shared/components/icons';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { useConfirm } from '@/shared/stores/confirmStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useAddNode } from '@/features/canvas/hooks/useAddNode';
import { useArrangeAnimation } from '@/features/canvas/hooks/useArrangeAnimation';
import styles from './WorkspaceControls.module.css';

// eslint-disable-next-line max-lines-per-function -- workspace toolbar with multiple actions
export function WorkspaceControls() {
    const { user } = useAuthStore();
    const { currentWorkspaceId, workspaces, removeWorkspace, setCurrentWorkspaceId } = useWorkspaceStore();

    // Use unified node creation hook (single source of truth)
    const handleAddNode = useAddNode();

    const canvasFreeFlow = useSettingsStore((s) => s.canvasFreeFlow);
    const toggleCanvasFreeFlow = useSettingsStore((s) => s.toggleCanvasFreeFlow);

    const clearCanvas = useCanvasStore((s) => s.clearCanvas);
    const arrangeNodes = useCanvasStore((s) => s.arrangeNodes);
    const nodes = useCanvasStore((s) => s.nodes);
    const nodeCount = nodes.length;

    const { animatedArrange } = useArrangeAnimation(null, arrangeNodes);

    const [isDeleting, setIsDeleting] = useState(false);
    const confirm = useConfirm();

    const handleArrangeNodes = useCallback(() => {
        if (nodeCount === 0) return;
        animatedArrange();
        toast.success(strings.layout.arrangeSuccess);
    }, [animatedArrange, nodeCount]);

    const handleClearCanvas = useCallback(async () => {
        if (nodeCount === 0) return;
        const confirmed = await confirm({
            title: strings.canvas.clearConfirmTitle,
            message: strings.canvas.clearConfirm,
            confirmText: strings.canvas.clearConfirmButton,
            isDestructive: true,
        });
        if (confirmed) {
            clearCanvas();
        }
    }, [clearCanvas, nodeCount, confirm]);

    const handleDeleteWorkspace = useCallback(async () => {
        if (!user || !currentWorkspaceId || isDeleting) return;
        const userId = user.id;

        // Don't delete the default/only workspace if possible, or at least confirm
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

            // Remove from local store
            removeWorkspace(currentWorkspaceId);

            // Switch to another workspace if available
            const remainingWorkspaces = workspaces.filter(ws => ws.id !== currentWorkspaceId);
            const nextWorkspace = remainingWorkspaces[0];
            if (nextWorkspace) {
                setCurrentWorkspaceId(nextWorkspace.id);
            } else {
                setCurrentWorkspaceId(DEFAULT_WORKSPACE_ID);
                clearCanvas();
            }

            toast.success(strings.workspace.deleteSuccess);
        } catch (error) {
            console.error('[WorkspaceControls] Failed to delete workspace:', error);
            toast.error(strings.errors.generic);
        } finally {
            setIsDeleting(false);
        }
    }, [user, currentWorkspaceId, workspaces, removeWorkspace, setCurrentWorkspaceId, clearCanvas, isDeleting, confirm]);

    return (
        <div className={styles.container}>
            <button
                className={styles.button}
                onClick={handleAddNode}
                title={strings.workspace.addNodeTooltip}
            >
                <PlusIcon size={20} />
            </button>
            <div className={styles.divider} />
            <button
                className={styles.button}
                onClick={handleArrangeNodes}
                disabled={nodeCount === 0}
                title={strings.workspace.arrangeNodesTooltip}
            >
                <GridIcon size={20} />
            </button>
            <div className={styles.divider} />
            <button
                className={`${styles.button} ${canvasFreeFlow ? styles.buttonActive : ''}`}
                onClick={toggleCanvasFreeFlow}
                aria-pressed={canvasFreeFlow}
                aria-label={strings.workspace.freeFlowTooltip}
                title={strings.workspace.freeFlowTooltip}
            >
                <FreeFlowIcon size={20} />
            </button>
            <div className={styles.divider} />
            <button
                className={styles.button}
                onClick={handleClearCanvas}
                disabled={nodeCount === 0}
                title={strings.canvas.clearCanvas}
            >
                <EraserIcon size={20} />
            </button>
            <div className={styles.divider} />
            <button
                className={`${styles.button} ${styles.deleteButton}`}
                onClick={handleDeleteWorkspace}
                disabled={isDeleting}
                title={strings.workspace.deleteWorkspaceTooltip}
            >
                <TrashIcon size={20} />
            </button>
        </div>
    );
}
