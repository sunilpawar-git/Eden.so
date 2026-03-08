/**
 * Tests for useUndoableActions hook
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useUndoableActions } from '../useUndoableActions';
import type { CanvasNode } from '../../types/node';
import type { CanvasEdge } from '../../types/edge';

function createMockNode(id: string, overrides?: Partial<CanvasNode>): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        position: { x: 0, y: 0 },
        data: { prompt: '', output: '', tags: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function createMockEdge(id: string, source: string, target: string): CanvasEdge {
    return {
        id,
        workspaceId: 'ws-1',
        sourceNodeId: source,
        targetNodeId: target,
        relationshipType: 'related',
    };
}

describe('useUndoableActions', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
    });

    describe('deleteNodeWithUndo', () => {
        it('removes node AND dispatches PUSH to historyStore', () => {
            const node = createMockNode('n1');
            useCanvasStore.getState().addNode(node);

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.deleteNodeWithUndo(['n1']));

            expect(useCanvasStore.getState().nodes).toHaveLength(0);
            expect(useHistoryStore.getState().undoStack).toHaveLength(1);
            expect(useHistoryStore.getState().undoStack[0]!.type).toBe('deleteNode');
        });

        it('captures connected edges in frozen snapshot', () => {
            const n1 = createMockNode('n1');
            const n2 = createMockNode('n2');
            const edge = createMockEdge('e1', 'n1', 'n2');
            useCanvasStore.getState().setNodes([n1, n2]);
            useCanvasStore.getState().setEdges([edge]);

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.deleteNodeWithUndo(['n1']));

            expect(useCanvasStore.getState().nodes).toHaveLength(1);
            expect(useCanvasStore.getState().edges).toHaveLength(0);
        });

        it('undo restores node at original array index', () => {
            const n1 = createMockNode('n1');
            const n2 = createMockNode('n2');
            const n3 = createMockNode('n3');
            useCanvasStore.getState().setNodes([n1, n2, n3]);

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.deleteNodeWithUndo(['n2']));

            expect(useCanvasStore.getState().nodes).toHaveLength(2);

            // Undo
            act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));

            const nodes = useCanvasStore.getState().nodes;
            expect(nodes).toHaveLength(3);
            expect(nodes[1]!.id).toBe('n2'); // restored at original index
        });

        it('undo restores connected edges (orphan-guarded)', () => {
            const n1 = createMockNode('n1');
            const n2 = createMockNode('n2');
            const edge = createMockEdge('e1', 'n1', 'n2');
            useCanvasStore.getState().setNodes([n1, n2]);
            useCanvasStore.getState().setEdges([edge]);

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.deleteNodeWithUndo(['n1']));

            // Undo
            act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));

            expect(useCanvasStore.getState().nodes).toHaveLength(2);
            expect(useCanvasStore.getState().edges).toHaveLength(1);
            expect(useCanvasStore.getState().edges[0]!.id).toBe('e1');
        });

        it('redo re-deletes the node', () => {
            const node = createMockNode('n1');
            useCanvasStore.getState().addNode(node);

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.deleteNodeWithUndo(['n1']));
            act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));

            expect(useCanvasStore.getState().nodes).toHaveLength(1);

            act(() => useHistoryStore.getState().dispatch({ type: 'REDO' }));
            expect(useCanvasStore.getState().nodes).toHaveLength(0);
        });

        it('batchDelete uses correct command type for multiple nodes', () => {
            useCanvasStore.getState().setNodes([createMockNode('n1'), createMockNode('n2')]);

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.deleteNodeWithUndo(['n1', 'n2']));

            expect(useHistoryStore.getState().undoStack[0]!.type).toBe('batchDelete');
        });
    });

    describe('addNodeWithUndo', () => {
        it('adds node AND dispatches PUSH to historyStore', () => {
            const node = createMockNode('n1');

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.addNodeWithUndo(node));

            expect(useCanvasStore.getState().nodes).toHaveLength(1);
            expect(useHistoryStore.getState().undoStack).toHaveLength(1);
            expect(useHistoryStore.getState().undoStack[0]!.type).toBe('addNode');
        });

        it('undo removes the added node', () => {
            const node = createMockNode('n1');

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.addNodeWithUndo(node));
            act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));

            expect(useCanvasStore.getState().nodes).toHaveLength(0);
        });
    });

    describe('integration round-trips', () => {
        it('add → delete → undo → node exists at correct index', () => {
            const n1 = createMockNode('n1');
            const n2 = createMockNode('n2');
            useCanvasStore.getState().setNodes([n1, n2]);

            const { result } = renderHook(() => useUndoableActions());

            // Delete first node
            act(() => result.current.deleteNodeWithUndo(['n1']));
            expect(useCanvasStore.getState().nodes).toHaveLength(1);

            // Undo
            act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));
            expect(useCanvasStore.getState().nodes).toHaveLength(2);
            expect(useCanvasStore.getState().nodes[0]!.id).toBe('n1');
        });

        it('delete node with 2 edges → undo → node + both edges restored', () => {
            const n1 = createMockNode('n1');
            const n2 = createMockNode('n2');
            const n3 = createMockNode('n3');
            const e1 = createMockEdge('e1', 'n1', 'n2');
            const e2 = createMockEdge('e2', 'n1', 'n3');
            useCanvasStore.getState().setNodes([n1, n2, n3]);
            useCanvasStore.getState().setEdges([e1, e2]);

            const { result } = renderHook(() => useUndoableActions());
            act(() => result.current.deleteNodeWithUndo(['n1']));

            expect(useCanvasStore.getState().edges).toHaveLength(0);

            // Undo
            act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));
            expect(useCanvasStore.getState().nodes).toHaveLength(3);
            expect(useCanvasStore.getState().edges).toHaveLength(2);
        });

        it('orphan guard: delete A → delete B → undo B → edge NOT restored if A gone', () => {
            const n1 = createMockNode('n1');
            const n2 = createMockNode('n2');
            const edge = createMockEdge('e1', 'n1', 'n2');
            useCanvasStore.getState().setNodes([n1, n2]);
            useCanvasStore.getState().setEdges([edge]);

            const { result } = renderHook(() => useUndoableActions());

            // Delete n1 first (removes edge too)
            act(() => result.current.deleteNodeWithUndo(['n1']));
            // Delete n2
            act(() => result.current.deleteNodeWithUndo(['n2']));

            // Undo n2 only — n1 still gone, so edge should NOT be restored
            act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));

            expect(useCanvasStore.getState().nodes).toHaveLength(1);
            expect(useCanvasStore.getState().nodes[0]!.id).toBe('n2');
            expect(useCanvasStore.getState().edges).toHaveLength(0); // orphan-guarded
        });
    });
});
