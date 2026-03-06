/**
 * useNodeResizeHandlers — unit tests
 * Verifies stopPropagation on each handler and delegation to useNodeResize.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeResizeHandlers } from '../useNodeResizeHandlers';
import { useCanvasStore } from '../../stores/canvasStore';
import { createIdeaNode } from '../../types/node';

const NODE_ID = 'resize-test-node';
const WORKSPACE_ID = 'ws1';

function makeMouseEvent(): React.MouseEvent {
    return { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
}

describe('useNodeResizeHandlers', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
        const node = createIdeaNode(NODE_ID, WORKSPACE_ID, { x: 0, y: 0 });
        useCanvasStore.getState().addNode(node);
    });

    it('returns capability flags from useNodeResize', () => {
        const { result } = renderHook(() => useNodeResizeHandlers(NODE_ID));
        expect(typeof result.current.canExpandWidth).toBe('boolean');
        expect(typeof result.current.canExpandHeight).toBe('boolean');
        expect(typeof result.current.canShrinkWidth).toBe('boolean');
        expect(typeof result.current.canShrinkHeight).toBe('boolean');
    });

    it('handleMouseDown calls stopPropagation', () => {
        const { result } = renderHook(() => useNodeResizeHandlers(NODE_ID));
        const e = makeMouseEvent();
        act(() => result.current.handleMouseDown(e));
        expect(e.stopPropagation).toHaveBeenCalledOnce();
    });

    it('handleExpandWidth calls stopPropagation and expands node width', () => {
        const { result } = renderHook(() => useNodeResizeHandlers(NODE_ID));
        const widthBefore = useCanvasStore.getState().nodes.find((n) => n.id === NODE_ID)!.width ?? 0;
        const e = makeMouseEvent();
        act(() => result.current.handleExpandWidth(e));
        expect(e.stopPropagation).toHaveBeenCalledOnce();
        const widthAfter = useCanvasStore.getState().nodes.find((n) => n.id === NODE_ID)!.width ?? 0;
        expect(widthAfter).toBeGreaterThan(widthBefore);
    });

    it('handleExpandHeight calls stopPropagation and expands node height', () => {
        const { result } = renderHook(() => useNodeResizeHandlers(NODE_ID));
        const heightBefore = useCanvasStore.getState().nodes.find((n) => n.id === NODE_ID)!.height ?? 0;
        const e = makeMouseEvent();
        act(() => result.current.handleExpandHeight(e));
        expect(e.stopPropagation).toHaveBeenCalledOnce();
        const heightAfter = useCanvasStore.getState().nodes.find((n) => n.id === NODE_ID)!.height ?? 0;
        expect(heightAfter).toBeGreaterThan(heightBefore);
    });

    it('handleShrinkWidth calls stopPropagation (no-op when already at min)', () => {
        const { result } = renderHook(() => useNodeResizeHandlers(NODE_ID));
        const e = makeMouseEvent();
        act(() => result.current.handleShrinkWidth(e));
        expect(e.stopPropagation).toHaveBeenCalledOnce();
    });

    it('handleShrinkHeight calls stopPropagation (no-op when already at min)', () => {
        const { result } = renderHook(() => useNodeResizeHandlers(NODE_ID));
        const e = makeMouseEvent();
        act(() => result.current.handleShrinkHeight(e));
        expect(e.stopPropagation).toHaveBeenCalledOnce();
    });

    it('handleShrinkWidth shrinks width when above minimum', () => {
        // Expand first to ensure above min
        const { result } = renderHook(() => useNodeResizeHandlers(NODE_ID));
        const eExpand = makeMouseEvent();
        act(() => result.current.handleExpandWidth(eExpand));
        const widthExpanded = useCanvasStore.getState().nodes.find((n) => n.id === NODE_ID)!.width ?? 0;

        const eShrink = makeMouseEvent();
        act(() => result.current.handleShrinkWidth(eShrink));
        expect(eShrink.stopPropagation).toHaveBeenCalledOnce();
        const widthShrunk = useCanvasStore.getState().nodes.find((n) => n.id === NODE_ID)!.width ?? 0;
        expect(widthShrunk).toBeLessThan(widthExpanded);
    });
});
