/**
 * useExportActions — Quick copy and dialog-open logic for the SelectionToolbar.
 * Reads canvas state via getState() inside callbacks (no selector subscriptions).
 */
import { useCallback, useState } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { collectMultiRootBranch } from '../services/branchTraversal';
import type { BranchNode } from '../services/branchTraversal';
import { branchToMarkdown } from '../services/markdownExporter';
import { exportStrings } from '../strings/exportStrings';
import { toast } from '@/shared/stores/toastStore';
import { trackSettingsChanged } from '@/shared/services/analyticsService';

export interface UseExportActionsReturn {
    readonly handleQuickCopy: () => void;
    readonly handleOpenExport: () => void;
    readonly exportRoots: readonly BranchNode[] | null;
    readonly clearExportRoots: () => void;
}

function collectRoots(): readonly BranchNode[] {
    const { nodes, edges, selectedNodeIds } = useCanvasStore.getState();
    return collectMultiRootBranch(selectedNodeIds, nodes, edges);
}

export function useExportActions(): UseExportActionsReturn {
    const [exportRoots, setExportRoots] = useState<readonly BranchNode[] | null>(null);

    const handleQuickCopy = useCallback(() => {
        const roots = collectRoots();
        if (roots.length === 0) {
            toast.error(exportStrings.labels.noContent);
            return;
        }
        const markdown = branchToMarkdown(roots);
        navigator.clipboard.writeText(markdown)
            .then(() => toast.success(exportStrings.labels.copied))
            .catch(() => toast.error(exportStrings.labels.exportError));
        trackSettingsChanged('branch_export', 'quick_copy');
    }, []);

    const handleOpenExport = useCallback(() => {
        const roots = collectRoots();
        if (roots.length === 0) {
            toast.error(exportStrings.labels.noContent);
            return;
        }
        setExportRoots(roots);
    }, []);

    const clearExportRoots = useCallback(() => {
        setExportRoots(null);
    }, []);

    return { handleQuickCopy, handleOpenExport, exportRoots, clearExportRoots };
}
