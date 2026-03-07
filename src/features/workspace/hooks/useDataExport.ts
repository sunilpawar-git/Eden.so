/**
 * useDataExport — Downloads workspace nodes and edges as a sanitized JSON file.
 * Reads from getState() at export time to avoid reactive subscription churn.
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { trackSettingsChanged } from '@/shared/services/analyticsService';
import { downloadAsFile } from '@/shared/utils/fileDownload';
import { exportStrings } from '@/features/export/strings/exportStrings';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

function sanitizeNode(node: CanvasNode) {
    return { id: node.id, type: node.type, position: node.position, data: node.data };
}

function sanitizeEdge(edge: CanvasEdge) {
    return { id: edge.id, sourceNodeId: edge.sourceNodeId, targetNodeId: edge.targetNodeId, relationshipType: edge.relationshipType };
}

export function useDataExport() {
    const exportData = useCallback(() => {
        const { nodes, edges } = useCanvasStore.getState();

        const payload = {
            exportedAt: new Date().toISOString(),
            nodes: nodes.map(sanitizeNode),
            edges: edges.map(sanitizeEdge),
        };

        const json = JSON.stringify(payload, null, 2);
        downloadAsFile(json, `${exportStrings.labels.filenamePrefix}-${Date.now()}.json`, 'application/json');
        trackSettingsChanged('data_export', 'triggered');
    }, []);

    return { exportData };
}
