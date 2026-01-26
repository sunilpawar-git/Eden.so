/**
 * SynthesisIndicator - Glowing (+) button on nodes with incoming edges
 * Triggers AI synthesis from upstream chain when clicked
 */
import { useCallback, useMemo } from 'react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '@/features/ai/stores/aiStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import styles from './SynthesisIndicator.module.css';

interface SynthesisIndicatorProps {
    nodeId: string;
}

export function SynthesisIndicator({ nodeId }: SynthesisIndicatorProps) {
    const edges = useCanvasStore((s) => s.edges);
    const { isGenerating } = useAIStore();
    const { synthesizeUpstreamChain } = useNodeGeneration();

    // Check if this node has any incoming edges
    const hasIncomingEdges = useMemo(() => {
        return edges.some((edge) => edge.targetNodeId === nodeId);
    }, [edges, nodeId]);

    const handleClick = useCallback(async () => {
        if (isGenerating) return;
        await synthesizeUpstreamChain(nodeId);
    }, [isGenerating, nodeId, synthesizeUpstreamChain]);

    if (!hasIncomingEdges) {
        return null;
    }

    return (
        <button
            className={`${styles.indicator} ${styles.glowing}`}
            onClick={handleClick}
            disabled={isGenerating}
            title={strings.canvas.synthesize}
            aria-label={strings.canvas.synthesize}
        >
            <span className={styles.icon}>✨</span>
        </button>
    );
}
