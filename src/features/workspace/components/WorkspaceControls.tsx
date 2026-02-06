import { useCallback, useState } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '../stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '@/features/canvas/types/node';
import { deleteWorkspace } from '../services/workspaceService';
import { PlusIcon, TrashIcon, EraserIcon, GridIcon } from '@/shared/components/icons';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { calculateNextNodePosition } from '@/features/canvas/stores/canvasStoreHelpers';
import { usePanToNode } from '@/features/canvas/hooks/usePanToNode';
import styles from './WorkspaceControls.module.css';

export function WorkspaceControls() {
    const { user } = useAuthStore();
    const { currentWorkspaceId, workspaces, removeWorkspace, setCurrentWorkspaceId } = useWorkspaceStore();
    const { panToPosition } = usePanToNode();

    // Optimize store selectors to avoid unnecessary re-renders
    const addNode = useCanvasStore((s) => s.addNode);
    const clearCanvas = useCanvasStore((s) => s.clearCanvas);
    const arrangeNodes = useCanvasStore((s) => s.arrangeNodes);
    // Needed for calculating next position
    const nodes = useCanvasStore((s) => s.nodes);
    const nodeCount = nodes.length;

    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddNode = useCallback(() => {
        if (!currentWorkspaceId) return;

        // Smart Append: Calculate next grid position
        const nextPos = calculateNextNodePosition(nodes);
        const id = `node-${Date.now()}`;

        addNode({
            id,
            workspaceId: currentWorkspaceId,
            type: 'idea',
            position: nextPos,
            data: {
                content: '',
                prompt: '',
                output: '',
                isGenerating: false,
                isPromptCollapsed: false
            },
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Pan to the new node to ensure it's visible
        panToPosition(nextPos.x, nextPos.y);
    }, [addNode, currentWorkspaceId, nodes, panToPosition]);

    const handleArrangeNodes = useCallback(() => {
        if (nodeCount === 0) return;
        arrangeNodes();
        toast.success('Nodes arranged in grid');
    }, [arrangeNodes, nodeCount]);

    const handleClearCanvas = useCallback(() => {
        if (nodeCount === 0) return;

        const confirmed = window.confirm(strings.canvas.clearConfirm);
        if (confirmed) {
            clearCanvas();
        }
    }, [clearCanvas, nodeCount]);

    const handleDeleteWorkspace = useCallback(async () => {
        if (!user || !currentWorkspaceId || isDeleting) return;
        const userId = user.id;

        // Don't delete the default/only workspace if possible, or at least confirm
        if (currentWorkspaceId === DEFAULT_WORKSPACE_ID) {
            toast.error(strings.workspace.deleteDefaultError);
            return;
        }

        const confirmed = window.confirm(strings.workspace.deleteConfirm);
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            await deleteWorkspace(userId, currentWorkspaceId);

            // Remove from local store
            removeWorkspace(currentWorkspaceId);

            // Switch to another workspace if available
            const remainingWorkspaces = workspaces.filter(ws => ws.id !== currentWorkspaceId);
            if (remainingWorkspaces.length > 0) {
                setCurrentWorkspaceId(remainingWorkspaces[0]!.id);
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
    }, [user, currentWorkspaceId, workspaces, removeWorkspace, setCurrentWorkspaceId, clearCanvas, isDeleting]);

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
