import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { PlusIcon, GridIcon, FreeFlowIcon } from '@/shared/components/icons';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useAddNode } from '@/features/canvas/hooks/useAddNode';
import { useArrangeAnimation } from '@/features/canvas/hooks/useArrangeAnimation';
import { DeleteWorkspaceButton } from './DeleteWorkspaceButton';
import { ClearCanvasButton } from './ClearCanvasButton';
import styles from './WorkspaceControls.module.css';

export function WorkspaceControls() {
    const handleAddNode = useAddNode();
    const canvasFreeFlow = useSettingsStore((s) => s.canvasFreeFlow);
    const nodeCount = useCanvasStore((s) => s.nodes.length);

    const arrangeNodes = useCallback(() => { useCanvasStore.getState().arrangeNodes(); }, []);
    const { animatedArrange } = useArrangeAnimation(null, arrangeNodes);

    const handleArrangeNodes = useCallback(() => {
        if (nodeCount === 0) return;
        animatedArrange();
        toast.success(strings.layout.arrangeSuccess);
    }, [animatedArrange, nodeCount]);

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
                onClick={() => useSettingsStore.getState().toggleCanvasFreeFlow()}
                aria-pressed={canvasFreeFlow}
                aria-label={strings.workspace.freeFlowTooltip}
                title={strings.workspace.freeFlowTooltip}
            >
                <FreeFlowIcon size={20} />
            </button>
            <div className={styles.divider} />
            <ClearCanvasButton nodeCount={nodeCount} />
            <div className={styles.divider} />
            <DeleteWorkspaceButton />
        </div>
    );
}
