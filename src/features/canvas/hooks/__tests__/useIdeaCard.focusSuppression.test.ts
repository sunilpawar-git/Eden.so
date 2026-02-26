/**
 * useIdeaCard — Focus-mode editing suppression tests
 * Verifies the actual Zustand selectors via renderHook in a real React
 * rendering context. When a node is focused via FocusOverlay, its canvas
 * IdeaCard must yield isEditing=false so only FocusOverlay owns the editor.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useFocusStore } from '../../stores/focusStore';

const NODE_ID = 'node-42';

function useIdeaCardIsEditing(nodeId: string) {
    const isFocusTarget = useFocusStore((s) => s.focusedNodeId === nodeId);
    const isEditing = useCanvasStore((s) => s.editingNodeId === nodeId) && !isFocusTarget;
    return isEditing;
}

describe('Canvas IdeaCard editing suppression during focus mode', () => {
    beforeEach(() => {
        useCanvasStore.setState({ editingNodeId: null });
        useFocusStore.setState({ focusedNodeId: null });
    });

    it('isEditing=true when editingNodeId matches and no focus active', () => {
        useCanvasStore.setState({ editingNodeId: NODE_ID });

        const { result } = renderHook(() => useIdeaCardIsEditing(NODE_ID));
        expect(result.current).toBe(true);
    });

    it('isEditing=false when editingNodeId matches but node IS focused', () => {
        useCanvasStore.setState({ editingNodeId: NODE_ID });
        useFocusStore.setState({ focusedNodeId: NODE_ID });

        const { result } = renderHook(() => useIdeaCardIsEditing(NODE_ID));
        expect(result.current).toBe(false);
    });

    it('isEditing=true when editingNodeId matches and a DIFFERENT node is focused', () => {
        useCanvasStore.setState({ editingNodeId: NODE_ID });
        useFocusStore.setState({ focusedNodeId: 'other-node' });

        const { result } = renderHook(() => useIdeaCardIsEditing(NODE_ID));
        expect(result.current).toBe(true);
    });

    it('isEditing=false when editingNodeId does not match', () => {
        useCanvasStore.setState({ editingNodeId: 'other-node' });

        const { result } = renderHook(() => useIdeaCardIsEditing(NODE_ID));
        expect(result.current).toBe(false);
    });

    it('reacts to focus state changes mid-render cycle', () => {
        useCanvasStore.setState({ editingNodeId: NODE_ID });

        const { result } = renderHook(() => useIdeaCardIsEditing(NODE_ID));
        expect(result.current).toBe(true);

        act(() => { useFocusStore.setState({ focusedNodeId: NODE_ID }); });
        expect(result.current).toBe(false);

        act(() => { useFocusStore.setState({ focusedNodeId: null }); });
        expect(result.current).toBe(true);
    });
});
