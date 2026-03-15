/** ClusterPreviewBar — floating accept/dismiss bar during cluster preview */
import React from 'react';
import { clusterStrings } from '@/shared/localization/clusterStrings';
import type { ClusterPhase } from '../stores/clusterPreviewStore';
import type { ClusterGroup } from '../types/cluster';

interface ClusterPreviewBarProps {
    readonly phase: ClusterPhase;
    readonly previewGroups: readonly ClusterGroup[] | null;
    readonly onAccept: () => void;
    readonly onDismiss: () => void;
}

export const ClusterPreviewBar = React.memo(function ClusterPreviewBar({ phase, previewGroups, onAccept, onDismiss }: ClusterPreviewBarProps) {
    if (phase === 'idle') return null;

    const isLoading = phase === 'computing' || phase === 'labeling';
    const text = isLoading
        ? clusterStrings.labels.analyzing
        : clusterStrings.labels.foundThemes(previewGroups?.length ?? 0);

    return (
        <div className="absolute bottom-[var(--space-2xl)] left-1/2 -translate-x-1/2 flex items-center gap-2 py-1 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--card-shadow)] z-[var(--z-sticky)] select-none" role="status">
            <span className="text-[var(--font-size-sm)] text-[var(--color-text-primary)] whitespace-nowrap">{text}</span>
            {phase === 'preview' && (
                <>
                    <button className="py-0.5 px-2 text-[var(--font-size-sm)] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-surface-hover)]" onClick={onAccept} aria-label={clusterStrings.labels.accept}>
                        {clusterStrings.labels.accept}
                    </button>
                    <button className="py-0.5 px-2 text-[var(--font-size-sm)] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-[var(--color-surface-hover)]" onClick={onDismiss} aria-label={clusterStrings.labels.dismiss}>
                        {clusterStrings.labels.dismiss}
                    </button>
                </>
            )}
        </div>
    );
});
