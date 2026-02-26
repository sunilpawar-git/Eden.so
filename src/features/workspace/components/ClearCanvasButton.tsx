import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { EraserIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import { useConfirm } from '@/shared/stores/confirmStore';
import styles from './WorkspaceControls.module.css';

interface ClearCanvasButtonProps {
    nodeCount: number;
}

export function ClearCanvasButton({ nodeCount }: ClearCanvasButtonProps) {
    const confirm = useConfirm();

    const handleClearCanvas = useCallback(async () => {
        if (nodeCount === 0) return;
        const confirmed = await confirm({
            title: strings.canvas.clearConfirmTitle,
            message: strings.canvas.clearConfirm,
            confirmText: strings.canvas.clearConfirmButton,
            isDestructive: true,
        });
        if (confirmed) {
            useCanvasStore.getState().clearCanvas();
        }
    }, [nodeCount, confirm]);

    return (
        <button
            className={styles.button}
            onClick={handleClearCanvas}
            disabled={nodeCount === 0}
            title={strings.canvas.clearCanvas}
        >
            <EraserIcon size={20} />
        </button>
    );
}
