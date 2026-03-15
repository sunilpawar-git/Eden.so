/** SynthesisFooter — source trace and re-synthesize action for synthesis nodes */
import React, { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { synthesisStrings } from '../strings/synthesisStrings';

interface SynthesisFooterProps {
    readonly sourceCount: number;
    readonly sourceNodeIds: readonly string[];
    readonly onReSynthesize: () => void;
}

export const SynthesisFooter = React.memo(function SynthesisFooter({
    sourceCount,
    sourceNodeIds,
    onReSynthesize,
}: SynthesisFooterProps) {
    const handleHighlightSources = useCallback(() => {
        const store = useCanvasStore.getState();
        store.clearSelection();
        sourceNodeIds.forEach((id) => store.selectNode(id));
    }, [sourceNodeIds]);

    return (
        <div className="flex items-center justify-between py-1 px-2 border-t border-[var(--color-border)] text-[var(--font-size-xs)] text-[var(--color-text-secondary)]">
            <button className="bg-transparent border-none text-[var(--node-status-synthesis)] cursor-pointer text-[var(--font-size-xs)] p-0 underline underline-offset-[var(--space-xxs)] hover:opacity-[var(--opacity-hover-subtle)]" onClick={handleHighlightSources} type="button" aria-label={synthesisStrings.labels.highlightSources}>
                {synthesisStrings.labels.viewSources(sourceCount)}
            </button>
            <button
                className="bg-transparent border border-[var(--color-border)] rounded-sm text-[var(--color-text-secondary)] cursor-pointer text-[var(--font-size-sm)] leading-none py-0.5 px-1 hover:bg-[var(--color-hover)] hover:text-[var(--node-status-synthesis)]"
                onClick={onReSynthesize}
                type="button"
                aria-label={synthesisStrings.labels.reSynthesize}
            >
                ↻
            </button>
        </div>
    );
});
