/**
 * useFocusMode — Bridge hook for focus mode orchestration
 * Reads focus state, resolves focused node data, handles ESC-to-close.
 * ESC is suppressed when a node is in editing mode (TipTap owns ESC there).
 */
import { useEffect, useCallback } from 'react';
import { useFocusStore } from '../stores/focusStore';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import type { CanvasNode } from '../types/node';

interface FocusModeResult {
    focusedNodeId: string | null;
    focusedNode: CanvasNode | null;
    isFocused: boolean;
    enterFocus: (nodeId: string) => void;
    exitFocus: () => void;
}

export function useFocusMode(): FocusModeResult {
    const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
    const focusedNode = useCanvasStore((s) =>
        focusedNodeId ? getNodeMap(s.nodes).get(focusedNodeId) ?? null : null,
    );
    const isFocused = focusedNodeId !== null;

    const exitFocus = useCallback(() => {
        useFocusStore.getState().exitFocus();
        useCanvasStore.getState().stopEditing();
    }, []);

    const enterFocus = useCallback((nodeId: string) => {
        useFocusStore.getState().enterFocus(nodeId);
    }, []);

    useEffect(() => {
        if (!isFocused) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            const isEditing = useCanvasStore.getState().editingNodeId !== null;
            if (isEditing) return;
            exitFocus();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isFocused, exitFocus]);

    return { focusedNodeId, focusedNode, isFocused, enterFocus, exitFocus };
}
