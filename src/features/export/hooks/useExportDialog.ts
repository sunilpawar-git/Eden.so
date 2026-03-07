/**
 * useExportDialog — Orchestrates the export preview, polish, copy, and download flow.
 * Uses useReducer for local state (not Zustand).
 */
import { useCallback, useMemo, useReducer } from 'react';
import type { BranchNode } from '../services/branchTraversal';
import { branchToMarkdown } from '../services/markdownExporter';
import { polishExport } from '../services/polishService';
import { downloadAsFile } from '@/shared/utils/fileDownload';
import { exportStrings } from '../strings/exportStrings';
import { toast } from '@/shared/stores/toastStore';
import { trackSettingsChanged } from '@/shared/services/analyticsService';
import { exportReducer, INITIAL_STATE } from './exportDialogReducer';

export interface UseExportDialogReturn {
    readonly markdown: string;
    readonly isPolishing: boolean;
    readonly togglePolish: () => Promise<void>;
    readonly copyToClipboard: () => Promise<void>;
    readonly download: () => void;
}

export function useExportDialog(roots: readonly BranchNode[]): UseExportDialogReturn {
    const [state, dispatch] = useReducer(exportReducer, INITIAL_STATE);
    const rawMarkdown = useMemo(() => branchToMarkdown(roots), [roots]);
    const markdown = state.isPolished && state.polishedMarkdown ? state.polishedMarkdown : rawMarkdown;

    const togglePolish = useCallback(async () => {
        if (state.isPolished) {
            dispatch({ type: 'TOGGLE_RAW' });
            return;
        }
        dispatch({ type: 'POLISH_START' });
        try {
            const polished = await polishExport(rawMarkdown);
            dispatch({ type: 'POLISH_COMPLETE', markdown: polished });
        } catch {
            toast.error(exportStrings.labels.exportError);
            dispatch({ type: 'POLISH_ERROR' });
        }
    }, [state.isPolished, rawMarkdown]);

    const copyToClipboard = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(markdown);
            toast.success(exportStrings.labels.copied);
        } catch {
            toast.error(exportStrings.labels.exportError);
        }
    }, [markdown]);

    const download = useCallback(() => {
        downloadAsFile(markdown, `${exportStrings.labels.filenamePrefix}-${Date.now()}.md`, 'text/markdown');
        trackSettingsChanged('branch_export', 'download');
    }, [markdown]);

    return { markdown, isPolishing: state.isPolishing, togglePolish, copyToClipboard, download };
}
