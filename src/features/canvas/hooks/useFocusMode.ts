/**
 * useFocusMode — Bridge hook for focus mode orchestration
 * Reads focus state, resolves focused node data, handles ESC-to-close.
 * ESC handler reads editingNodeId via getState() (not a selector) to avoid
 * subscribing FocusOverlay to editingNodeId changes that cascade re-renders.
 */
import { useCallback } from 'react';
import { useFocusStore, enterFocusWithEditing } from '../stores/focusStore';
import { useCanvasStore } from '../stores/canvasStore';
import { useNode } from './useNode';
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
    const focusedNode = useNode(focusedNodeId) ?? null;
    const isFocused = focusedNodeId !== null;

    const exitFocus = useCallback(() => {
        useFocusStore.getState().exitFocus();
        useCanvasStore.getState().stopEditing();
    }, []);

    const enterFocus = useCallback((nodeId: string) => {
        enterFocusWithEditing(nodeId);
    }, []);

    const handleEscape = useCallback(() => {
        if (useCanvasStore.getState().editingNodeId !== null) return;
        exitFocus();
    }, [exitFocus]);

    useEscapeLayer(ESCAPE_PRIORITY.FOCUS_MODE, isFocused, handleEscape);

    return { focusedNodeId, focusedNode, isFocused, enterFocus, exitFocus };
}
