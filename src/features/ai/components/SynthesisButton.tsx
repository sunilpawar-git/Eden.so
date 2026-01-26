/**
 * Synthesis Button - Appears when multiple nodes are connected
 */
import { useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '@/features/ai/stores/aiStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import styles from './SynthesisButton.module.css';

export function SynthesisButton() {
    const { selectedNodeIds } = useCanvasStore();
    const { isGenerating } = useAIStore();
    const { synthesizeConnectedNodes } = useNodeGeneration();

    // Only show if 2+ nodes are selected
    const selectedArray = Array.from(selectedNodeIds);
    const canSynthesize = selectedArray.length >= 2;

    const handleSynthesize = useCallback(async () => {
        if (!canSynthesize || isGenerating) return;
        await synthesizeConnectedNodes(selectedArray);
    }, [canSynthesize, isGenerating, selectedArray, synthesizeConnectedNodes]);

    if (!canSynthesize) return null;

    return (
        <button
            className={styles.synthesisButton}
            onClick={handleSynthesize}
            disabled={isGenerating}
            title={strings.canvas.synthesize}
        >
            <span className={styles.icon}>✨</span>
            <span className={styles.text}>{strings.canvas.synthesize}</span>
        </button>
    );
}
