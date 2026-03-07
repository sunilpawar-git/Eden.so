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

interface ExportState {
    readonly isPolishing: boolean;
    readonly polishedMarkdown: string | null;
    readonly isPolished: boolean;
}

type ExportAction =
    | { type: 'POLISH_START' }
    | { type: 'POLISH_COMPLETE'; markdown: string }
    | { type: 'POLISH_ERROR' }
    | { type: 'TOGGLE_RAW' };

const INITIAL_STATE: ExportState = { isPolishing: false, polishedMarkdown: null, isPolished: false };

function exportReducer(state: ExportState, action: ExportAction): ExportState {
    switch (action.type) {
        case 'POLISH_START':
            return { ...state, isPolishing: true };
        case 'POLISH_COMPLETE':
            return { isPolishing: false, polishedMarkdown: action.markdown, isPolished: true };
        case 'POLISH_ERROR':
            return { ...state, isPolishing: false };
        case 'TOGGLE_RAW':
            return { ...state, isPolished: false };
    }
}

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
        downloadAsFile(markdown, `actionstation-export-${Date.now()}.md`, 'text/markdown');
        trackSettingsChanged('branch_export', 'download');
    }, [markdown]);

    return { markdown, isPolishing: state.isPolishing, togglePolish, copyToClipboard, download };
}
