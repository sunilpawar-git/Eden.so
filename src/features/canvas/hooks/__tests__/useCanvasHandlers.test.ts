import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasHandlers } from '../useCanvasHandlers';
import { useCanvasStore } from '../../stores/canvasStore';
import { createIdeaNode } from '../../types/node';
import type { NodeChange } from '@xyflow/react';

vi.mock('../useCanvasEdgeHandlers', () => ({
    useCanvasEdgeHandlers: () => ({
        onEdgesChange: vi.fn(),
        onConnect: vi.fn(),
        onSelectionChange: vi.fn(),
    }),
}));

const createNode = (id: string, x: number, y: number) =>
    createIdeaNode(id, 'ws-1', { x, y });

describe('useCanvasHandlers', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useCanvasStore.setState({
            nodes: [createNode('n1', 0, 0), createNode('n2', 10, 10)],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns onNodesChange and edge handlers', () => {
        const { result } = renderHook(() =>
            useCanvasHandlers('ws-1', false)
        );
        expect(typeof result.current.onNodesChange).toBe('function');
        expect(typeof result.current.onEdgesChange).toBe('function');
        expect(typeof result.current.onConnect).toBe('function');
        expect(typeof result.current.onSelectionChange).toBe('function');
    });

    it('does nothing when canvas is locked', () => {
        const { result } = renderHook(() =>
            useCanvasHandlers('ws-1', true)
        );
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 100, y: 100 } },
        ];
        act(() => result.current.onNodesChange(changes));
        const nodes = useCanvasStore.getState().nodes;
        expect(nodes.find((n) => n.id === 'n1')?.position).toEqual({ x: 0, y: 0 });
    });

    it('applies position changes when unlocked (batched via RAF)', () => {
        const { result } = renderHook(() =>
            useCanvasHandlers('ws-1', false)
        );
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 50, y: 60 } },
        ];
        act(() => result.current.onNodesChange(changes));
        // Position changes are batched via requestAnimationFrame
        act(() => vi.runAllTimers());
        const nodes = useCanvasStore.getState().nodes;
        expect(nodes.find((n) => n.id === 'n1')?.position).toEqual({ x: 50, y: 60 });
    });

    it('applies remove changes when unlocked', () => {
        const { result } = renderHook(() =>
            useCanvasHandlers('ws-1', false)
        );
        const changes: NodeChange[] = [{ type: 'remove', id: 'n1' }];
        act(() => result.current.onNodesChange(changes));
        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(1);
        expect(nodes[0]!.id).toBe('n2');
    });

    it('does not apply position/remove when changes lack them', () => {
        const { result } = renderHook(() =>
            useCanvasHandlers('ws-1', false)
        );
        const changes: NodeChange[] = [
            { type: 'dimensions', id: 'n1', dimensions: { width: 300, height: 250 }, resizing: true },
        ];
        act(() => result.current.onNodesChange(changes));
        vi.runAllTimers();
        const nodes = useCanvasStore.getState().nodes;
        expect(nodes.find((n) => n.id === 'n1')?.position).toEqual({ x: 0, y: 0 });
    });

    it('schedules RAF for dimensions and calls updateNodeDimensions', () => {
        const { result } = renderHook(() =>
            useCanvasHandlers('ws-1', false)
        );
        const changes: NodeChange[] = [
            { type: 'position', id: 'n1', position: { x: 1, y: 1 } },
            { type: 'dimensions', id: 'n1', dimensions: { width: 300, height: 250 }, resizing: true },
        ];
        act(() => result.current.onNodesChange(changes));
        let node = useCanvasStore.getState().nodes.find((n) => n.id === 'n1');
        expect(node?.width).not.toBe(300);
        act(() => vi.runAllTimers());
        node = useCanvasStore.getState().nodes.find((n) => n.id === 'n1');
        expect(node?.width).toBe(300);
        expect(node?.height).toBe(250);
    });

    it('cancels RAF on unmount', () => {
        const cancelSpy = vi.spyOn(global, 'cancelAnimationFrame');
        const { result, unmount } = renderHook(() =>
            useCanvasHandlers('ws-1', false)
        );
        const changes: NodeChange[] = [
            { type: 'dimensions', id: 'n1', dimensions: { width: 300, height: 250 }, resizing: true },
        ];
        act(() => result.current.onNodesChange(changes));
        unmount();
        expect(cancelSpy).toHaveBeenCalled();
    });
});
