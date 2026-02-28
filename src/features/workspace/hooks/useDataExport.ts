/**
 * useDataExport — Downloads workspace nodes and edges as a sanitized JSON file.
 * Reads from getState() at export time to avoid reactive subscription churn.
 */
import { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { trackSettingsChanged } from '@/shared/services/analyticsService';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

const REVOKE_DELAY_MS = 200;

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
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `actionstation-export-${Date.now()}.json`;
        anchor.click();

        setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
        trackSettingsChanged('data_export', 'triggered');
    }, []);

    return { exportData };
}
