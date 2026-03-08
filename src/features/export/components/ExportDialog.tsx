import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { BranchNode } from '../services/branchTraversal';
import { useExportDialog } from '../hooks/useExportDialog';
import { ExportPreview } from './ExportPreview';
import { exportStrings } from '../strings/exportStrings';
import { strings } from '@/shared/localization/strings';
import styles from './ExportDialog.module.css';

interface ExportDialogProps {
    readonly roots: readonly BranchNode[];
    readonly onClose: () => void;
}

export const ExportDialog = React.memo(function ExportDialog({ roots, onClose }: ExportDialogProps) {
    const { markdown, isPolishing, togglePolish, copyToClipboard, download } = useExportDialog(roots);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleBackdropClick = useCallback(() => onClose(), [onClose]);
    const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

    return createPortal(
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={exportStrings.labels.exportSelection}
                onClick={stopPropagation}
            >
                <header className={styles.header}>
                    <h2 className={styles.title}>{exportStrings.labels.exportSelection}</h2>
                    <button className={styles.closeBtn} onClick={onClose} type="button" aria-label={strings.common.closeSymbol}>
                        {strings.common.closeSymbol}
                    </button>
                </header>
                <ExportPreview content={markdown} />
                <footer className={styles.actions}>
                    <button className={styles.actionBtn} onClick={togglePolish} disabled={isPolishing} type="button">
                        {isPolishing ? exportStrings.labels.polishing : exportStrings.labels.polish}
                    </button>
                    <button className={styles.actionBtn} onClick={copyToClipboard} type="button">
                        {exportStrings.labels.copyToClipboard}
                    </button>
                    <button className={styles.actionBtnPrimary} onClick={download} type="button">
                        {exportStrings.labels.download}
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
});
