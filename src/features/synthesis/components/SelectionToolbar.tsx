/** SelectionToolbar — floating toolbar when 2+ nodes are selected */
import React, { useCallback, useState } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useSynthesis } from '../hooks/useSynthesis';
import { SynthesisModePopover } from './SynthesisModePopover';
import type { SynthesisMode } from '../services/synthesisPrompts';
import { synthesisStrings } from '../strings/synthesisStrings';
import { exportStrings } from '@/features/export/strings/exportStrings';
import { useExportActions } from '@/features/export/hooks/useExportActions';
import { ExportDialog } from '@/features/export/components/ExportDialog';
import { captureError } from '@/shared/services/sentryService';

const MAX_SYNTHESIS_NODES = 50;

export const SelectionToolbar = React.memo(function SelectionToolbar() {
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const nodeCount = selectedNodeIds.size;
    const { synthesize, isSynthesizing, canSynthesize } = useSynthesis();
    const { handleQuickCopy, handleOpenExport, exportRoots, clearExportRoots } = useExportActions();
    const [isOpen, setIsOpen] = useState(false);
    const tooMany = nodeCount > MAX_SYNTHESIS_NODES;

    const handleOpenPopover = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleModeSelect = useCallback(
        (mode: SynthesisMode) => {
            setIsOpen(false);
            synthesize(mode).catch((e: unknown) => captureError(e));
        },
        [synthesize]
    );

    if (nodeCount < 2) return null;

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 py-2 px-4 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-dropdown)] z-[var(--z-dropdown)] animate-[toolbarIn_var(--transition-fast)_ease-out]" role="toolbar" aria-label={synthesisStrings.labels.synthesize} data-testid="selection-toolbar">
                <span className="text-[var(--font-size-sm)] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                    {nodeCount} {synthesisStrings.labels.ideas}
                </span>
                <button
                    className="inline-flex items-center gap-1 py-1 px-4 border-none rounded-md bg-[var(--node-status-synthesis)] text-[var(--color-text-on-primary)] text-[var(--font-size-sm)] font-medium cursor-pointer transition-all duration-150 ease-in-out whitespace-nowrap hover:enabled:opacity-[var(--opacity-hover-subtle)] disabled:opacity-[var(--opacity-disabled)] disabled:cursor-not-allowed"
                    onClick={handleOpenPopover}
                    disabled={isSynthesizing || !canSynthesize}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    type="button"
                    title={tooMany ? synthesisStrings.labels.tooManyNodes : undefined}
                >
                    {isSynthesizing ? synthesisStrings.labels.generating : synthesisStrings.labels.synthesize}
                </button>
                <button className="inline-flex items-center gap-1 py-1 px-4 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] text-[var(--font-size-sm)] font-medium cursor-pointer transition-colors duration-150 ease-in-out whitespace-nowrap hover:bg-[var(--color-surface-elevated)]" onClick={handleQuickCopy} type="button">
                    {exportStrings.labels.copyBranch}
                </button>
                <button className="inline-flex items-center gap-1 py-1 px-4 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] text-[var(--font-size-sm)] font-medium cursor-pointer transition-colors duration-150 ease-in-out whitespace-nowrap hover:bg-[var(--color-surface-elevated)]" onClick={handleOpenExport} type="button">
                    {exportStrings.labels.exportSelection}
                </button>
                {isOpen && (
                    <SynthesisModePopover onSelect={handleModeSelect} onClose={handleClose} />
                )}
            </div>
            {exportRoots && <ExportDialog roots={exportRoots} onClose={clearExportRoots} />}
        </>
    );
});
