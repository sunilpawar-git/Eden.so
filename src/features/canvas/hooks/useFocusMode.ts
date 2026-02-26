/**
 * useFocusMode — Bridge hook for focus mode orchestration
 * Reads focus state, resolves focused node data, handles ESC-to-close.
 * ESC is suppressed when a node is in editing mode (TipTap owns ESC there).
 */
import { useCallback } from 'react';
import { useFocusStore, enterFocusWithEditing } from '../stores/focusStore';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
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
        enterFocusWithEditing(nodeId);
    }, []);

    const editingNodeId = useCanvasStore((s) => s.editingNodeId);
    const escapeActive = isFocused && editingNodeId === null;
    useEscapeLayer(ESCAPE_PRIORITY.FOCUS_MODE, escapeActive, exitFocus);

    return { focusedNodeId, focusedNode, isFocused, enterFocus, exitFocus };
}
