/**
 * Tests for useDragBatch hook
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useDragBatch } from '../useDragBatch';
import type { CanvasNode } from '../../types/node';

function createMockNode(id: string, position = { x: 0, y: 0 }): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        position,
        data: { prompt: '', output: '', tags: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/** Simulate a ReactFlow drag event with minimal shape */
function mockDragEvent() {
    return {} as React.MouseEvent;
}

/** Simulate a ReactFlow Node for drag handlers (3rd param = all dragged nodes) */
function mockRfNode(id: string, x: number, y: number) {
    return { id, position: { x, y }, data: {} } as Parameters<
        ReturnType<typeof useDragBatch>['onNodeDragStart']
    >[1];
}

describe('useDragBatch', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
    });

    it('onNodeDragStart captures node position in ref', () => {
        const { result } = renderHook(() => useDragBatch());
        const n = mockRfNode('n1', 10, 20);
        // Should not throw
        act(() => {
            result.current.onNodeDragStart(mockDragEvent(), n, [n]);
        });
    });

    it('onNodeDragStop dispatches PUSH with moveNode command', () => {
        const { result } = renderHook(() => useDragBatch());
        const nStart = mockRfNode('n1', 10, 20);
        const nEnd = mockRfNode('n1', 50, 60);

        act(() => {
            result.current.onNodeDragStart(mockDragEvent(), nStart, [nStart]);
            result.current.onNodeDragStop(mockDragEvent(), nEnd, [nEnd]);
        });

        expect(useHistoryStore.getState().undoStack).toHaveLength(1);
        expect(useHistoryStore.getState().undoStack[0]!.type).toBe('moveNode');
    });

    it('undo after drag restores original position', () => {
        const node = createMockNode('n1', { x: 10, y: 20 });
        useCanvasStore.getState().addNode(node);

        const { result } = renderHook(() => useDragBatch());
        const nStart = mockRfNode('n1', 10, 20);
        const nEnd = mockRfNode('n1', 100, 200);

        act(() => {
            result.current.onNodeDragStart(mockDragEvent(), nStart, [nStart]);
            result.current.onNodeDragStop(mockDragEvent(), nEnd, [nEnd]);
        });

        // Undo
        act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));

        const restored = useCanvasStore.getState().nodes[0]!;
        expect(restored.position.x).toBe(10);
        expect(restored.position.y).toBe(20);
    });

    it('redo after undo restores dragged position', () => {
        const node = createMockNode('n1', { x: 10, y: 20 });
        useCanvasStore.getState().addNode(node);

        const { result } = renderHook(() => useDragBatch());
        const nStart = mockRfNode('n1', 10, 20);
        const nEnd = mockRfNode('n1', 100, 200);

        act(() => {
            result.current.onNodeDragStart(mockDragEvent(), nStart, [nStart]);
            result.current.onNodeDragStop(mockDragEvent(), nEnd, [nEnd]);
        });

        act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));
        act(() => useHistoryStore.getState().dispatch({ type: 'REDO' }));

        const restored = useCanvasStore.getState().nodes[0]!;
        expect(restored.position.x).toBe(100);
        expect(restored.position.y).toBe(200);
    });

    it('no-op when node position unchanged (click without drag)', () => {
        const { result } = renderHook(() => useDragBatch());
        const n = mockRfNode('n1', 10, 20);

        act(() => {
            result.current.onNodeDragStart(mockDragEvent(), n, [n]);
            result.current.onNodeDragStop(mockDragEvent(), n, [n]);
        });

        expect(useHistoryStore.getState().undoStack).toHaveLength(0);
    });

    it('multiple drags create separate undo entries when >1s apart', () => {
        const { result } = renderHook(() => useDragBatch());
        const n0 = mockRfNode('n1', 0, 0);
        const n10 = mockRfNode('n1', 10, 10);
        const n20 = mockRfNode('n1', 20, 20);

        // First drag
        act(() => {
            result.current.onNodeDragStart(mockDragEvent(), n0, [n0]);
            result.current.onNodeDragStop(mockDragEvent(), n10, [n10]);
        });

        // Advance time past coalesce window (1000ms)
        const originalNow = Date.now;
        Date.now = () => originalNow() + 2000;

        act(() => {
            result.current.onNodeDragStart(mockDragEvent(), n10, [n10]);
            result.current.onNodeDragStop(mockDragEvent(), n20, [n20]);
        });

        Date.now = originalNow;

        expect(useHistoryStore.getState().undoStack).toHaveLength(2);
    });

    describe('multi-node drag', () => {
        it('captures and restores positions of ALL dragged nodes', () => {
            const nodeA = createMockNode('a', { x: 0, y: 0 });
            const nodeB = createMockNode('b', { x: 100, y: 100 });
            useCanvasStore.getState().setNodes([nodeA, nodeB]);

            const { result } = renderHook(() => useDragBatch());
            const startA = mockRfNode('a', 0, 0);
            const startB = mockRfNode('b', 100, 100);
            const endA = mockRfNode('a', 50, 50);
            const endB = mockRfNode('b', 150, 150);

            act(() => {
                result.current.onNodeDragStart(mockDragEvent(), startA, [startA, startB]);
                result.current.onNodeDragStop(mockDragEvent(), endA, [endA, endB]);
            });

            expect(useHistoryStore.getState().undoStack).toHaveLength(1);
            expect(useHistoryStore.getState().undoStack[0]!.type).toBe('moveNode');

            // Undo — both nodes should return to original positions
            act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));

            const nodes = useCanvasStore.getState().nodes;
            const a = nodes.find((n) => n.id === 'a')!;
            const b = nodes.find((n) => n.id === 'b')!;
            expect(a.position).toEqual({ x: 0, y: 0 });
            expect(b.position).toEqual({ x: 100, y: 100 });
        });

        it('multi-node drag does NOT coalesce (entityId undefined)', () => {
            const nodeA = createMockNode('a', { x: 0, y: 0 });
            const nodeB = createMockNode('b', { x: 100, y: 100 });
            useCanvasStore.getState().setNodes([nodeA, nodeB]);

            const { result } = renderHook(() => useDragBatch());
            const startA = mockRfNode('a', 0, 0);
            const startB = mockRfNode('b', 100, 100);
            const endA = mockRfNode('a', 10, 10);
            const endB = mockRfNode('b', 110, 110);

            act(() => {
                result.current.onNodeDragStart(mockDragEvent(), startA, [startA, startB]);
                result.current.onNodeDragStop(mockDragEvent(), endA, [endA, endB]);
            });

            const cmd = useHistoryStore.getState().undoStack[0]!;
            expect(cmd.entityId).toBeUndefined();
        });

        it('single-node drag sets entityId for coalescing', () => {
            const nodeA = createMockNode('a', { x: 0, y: 0 });
            useCanvasStore.getState().addNode(nodeA);

            const { result } = renderHook(() => useDragBatch());
            const nStart = mockRfNode('a', 0, 0);
            const nEnd = mockRfNode('a', 10, 10);

            act(() => {
                result.current.onNodeDragStart(mockDragEvent(), nStart, [nStart]);
                result.current.onNodeDragStop(mockDragEvent(), nEnd, [nEnd]);
            });

            const cmd = useHistoryStore.getState().undoStack[0]!;
            expect(cmd.entityId).toBe('a');
        });
    });
});
