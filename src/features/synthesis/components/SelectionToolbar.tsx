/** SelectionToolbar — floating toolbar when 2+ nodes are selected */
import React, { useCallback, useState } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useSynthesis } from '../hooks/useSynthesis';
import { SynthesisModePopover } from './SynthesisModePopover';
import type { SynthesisMode } from '../services/synthesisPrompts';
import { synthesisStrings } from '../strings/synthesisStrings';
import { captureError } from '@/shared/services/sentryService';
import styles from './SelectionToolbar.module.css';

const MAX_SYNTHESIS_NODES = 50;

export const SelectionToolbar = React.memo(function SelectionToolbar() {
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const nodeCount = selectedNodeIds.size;
    const { synthesize, isSynthesizing, canSynthesize } = useSynthesis();
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
        <div className={styles.toolbar} role="toolbar" aria-label={synthesisStrings.labels.synthesize}>
            <span className={styles.count}>
                {nodeCount} {synthesisStrings.labels.ideas}
            </span>
            <button
                className={styles.synthesizeBtn}
                onClick={handleOpenPopover}
                disabled={isSynthesizing || !canSynthesize}
                aria-haspopup="true"
                aria-expanded={isOpen}
                type="button"
                title={tooMany ? synthesisStrings.labels.tooManyNodes : undefined}
            >
                {isSynthesizing ? synthesisStrings.labels.generating : synthesisStrings.labels.synthesize}
            </button>
            {isOpen && (
                <SynthesisModePopover onSelect={handleModeSelect} onClose={handleClose} />
            )}
        </div>
    );
});
