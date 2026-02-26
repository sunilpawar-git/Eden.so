/**
 * useFocusMode Tests - TDD: RED phase first
 * Tests for the focus mode orchestration hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusStore } from '../../stores/focusStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useFocusMode } from '../useFocusMode';
import type { CanvasNode } from '../../types/node';

const mockNode: CanvasNode = {
    id: 'node-1',
    workspaceId: 'workspace-1',
    type: 'idea',
    data: { prompt: 'Test', output: 'Output content', isGenerating: false, isPromptCollapsed: false },
    position: { x: 100, y: 200 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

const mockNode2: CanvasNode = {
    id: 'node-2',
    workspaceId: 'workspace-1',
    type: 'idea',
    data: { prompt: 'Second', output: 'Second output', isGenerating: false, isPromptCollapsed: false },
    position: { x: 300, y: 400 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

function pressKey(key: string) {
    act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key, bubbles: true, cancelable: true,
        }));
    });
}

describe('useFocusMode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useFocusStore.setState({ focusedNodeId: null });
        useCanvasStore.setState({
            nodes: [mockNode, mockNode2],
            edges: [],
            selectedNodeIds: new Set(),
            editingNodeId: null,
            draftContent: null,
            inputMode: 'note',
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns focusedNodeId, focusedNode, isFocused, enterFocus, exitFocus', () => {
        const { result } = renderHook(() => useFocusMode());
        expect(result.current).toHaveProperty('focusedNodeId');
        expect(result.current).toHaveProperty('focusedNode');
        expect(result.current).toHaveProperty('isFocused');
        expect(result.current).toHaveProperty('enterFocus');
        expect(result.current).toHaveProperty('exitFocus');
    });

    it('isFocused is false initially', () => {
        const { result } = renderHook(() => useFocusMode());
        expect(result.current.isFocused).toBe(false);
        expect(result.current.focusedNodeId).toBeNull();
        expect(result.current.focusedNode).toBeNull();
    });

    it('enterFocus sets focusedNodeId and editingNodeId in one transition', () => {
        const { result } = renderHook(() => useFocusMode());
        act(() => { result.current.enterFocus('node-1'); });
        expect(result.current.focusedNodeId).toBe('node-1');
        expect(result.current.isFocused).toBe(true);
        expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
    });

    it('focusedNode returns correct node data from canvasStore', () => {
        const { result } = renderHook(() => useFocusMode());
        act(() => { result.current.enterFocus('node-1'); });
        expect(result.current.focusedNode).toEqual(mockNode);
    });

    it('focusedNode is null when focusedNodeId does not match any node', () => {
        const { result } = renderHook(() => useFocusMode());
        act(() => { result.current.enterFocus('non-existent'); });
        expect(result.current.focusedNode).toBeNull();
    });

    it('exitFocus clears focusedNodeId and calls stopEditing', () => {
        const { result } = renderHook(() => useFocusMode());
        act(() => { result.current.enterFocus('node-1'); });
        expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        act(() => { result.current.exitFocus(); });
        expect(result.current.focusedNodeId).toBeNull();
        expect(result.current.isFocused).toBe(false);
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    it('ESC keydown calls exitFocus when focused and not editing', () => {
        const { result } = renderHook(() => useFocusMode());
        act(() => { result.current.enterFocus('node-1'); });
        expect(result.current.isFocused).toBe(true);

        act(() => { useCanvasStore.getState().stopEditing(); });
        pressKey('Escape');
        expect(result.current.isFocused).toBe(false);
    });

    it('ESC does nothing when not focused', () => {
        renderHook(() => useFocusMode());
        pressKey('Escape');
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('ESC does not close focus when a node is being edited', () => {
        const { result } = renderHook(() => useFocusMode());
        act(() => { result.current.enterFocus('node-1'); });
        useCanvasStore.setState({ editingNodeId: 'node-1' });

        pressKey('Escape');
        expect(result.current.isFocused).toBe(true);
    });

    it('cleans up ESC listener on unmount', () => {
        const { result, unmount } = renderHook(() => useFocusMode());
        act(() => { result.current.enterFocus('node-1'); });
        unmount();

        pressKey('Escape');
        expect(useFocusStore.getState().focusedNodeId).toBe('node-1');
    });
});
