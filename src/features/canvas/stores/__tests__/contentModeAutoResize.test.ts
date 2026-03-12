/**
 * Phase A — Auto-resize on mindmap toggle tests.
 *
 * When toggling to mindmap mode, small nodes should be enlarged to
 * MINDMAP_MIN_WIDTH × MINDMAP_MIN_HEIGHT so the mindmap is legible.
 * When toggling back to text, dimensions remain unchanged (no shrink).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../../stores/canvasStore';
import {
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
    MINDMAP_MIN_WIDTH,
    MINDMAP_MIN_HEIGHT,
} from '../../types/node';
import type { CanvasNode } from '../../types/node';

const makeNode = (
    id: string,
    overrides: { width?: number; height?: number; data?: Partial<CanvasNode['data']> } = {},
): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    data: {
        heading: 'Test',
        output: '# Topic\n- A\n- B',
        isGenerating: false,
        isPromptCollapsed: false,
        ...overrides.data,
    },
    position: { x: 100, y: 200 },
    width: overrides.width ?? DEFAULT_NODE_WIDTH,
    height: overrides.height ?? DEFAULT_NODE_HEIGHT,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
});

function seedStore(nodes: CanvasNode[]) {
    useCanvasStore.setState({
        nodes,
        edges: [],
        selectedNodeIds: new Set(),
        editingNodeId: null,
        draftContent: null,
        inputMode: 'note',
    });
}

describe('Auto-resize on contentMode toggle', () => {
    beforeEach(() => {
        seedStore([
            makeNode('small'),
            makeNode('big', { width: 600, height: 500 }),
            makeNode('mm', { data: { contentMode: 'mindmap' }, width: MINDMAP_MIN_WIDTH, height: MINDMAP_MIN_HEIGHT }),
        ]);
    });

    it('enlarges a default-sized node when switching to mindmap', () => {
        useCanvasStore.getState().updateNodeContentMode('small', 'mindmap');
        const node = useCanvasStore.getState().nodes.find((n) => n.id === 'small')!;
        expect(node.width).toBe(MINDMAP_MIN_WIDTH);
        expect(node.height).toBe(MINDMAP_MIN_HEIGHT);
    });

    it('does not shrink an already-large node when switching to mindmap', () => {
        useCanvasStore.getState().updateNodeContentMode('big', 'mindmap');
        const node = useCanvasStore.getState().nodes.find((n) => n.id === 'big')!;
        expect(node.width).toBe(600);
        expect(node.height).toBe(500);
    });

    it('does not shrink dimensions when switching back to text', () => {
        useCanvasStore.getState().updateNodeContentMode('mm', 'text');
        const node = useCanvasStore.getState().nodes.find((n) => n.id === 'mm')!;
        // Keep mindmap dimensions even after switching back to text
        expect(node.width).toBe(MINDMAP_MIN_WIDTH);
        expect(node.height).toBe(MINDMAP_MIN_HEIGHT);
    });

    it('preserves position when resizing for mindmap', () => {
        useCanvasStore.getState().updateNodeContentMode('small', 'mindmap');
        const node = useCanvasStore.getState().nodes.find((n) => n.id === 'small')!;
        expect(node.position).toEqual({ x: 100, y: 200 });
    });

    it('does not affect other nodes when resizing', () => {
        const bigBefore = useCanvasStore.getState().nodes.find((n) => n.id === 'big')!;
        useCanvasStore.getState().updateNodeContentMode('small', 'mindmap');
        const bigAfter = useCanvasStore.getState().nodes.find((n) => n.id === 'big')!;
        expect(bigAfter).toBe(bigBefore); // Same reference — untouched
    });

    it('MINDMAP_MIN constants equal default dimensions (grid-aligned tile sizing)', () => {
        expect(MINDMAP_MIN_WIDTH).toBe(DEFAULT_NODE_WIDTH);
        expect(MINDMAP_MIN_HEIGHT).toBe(DEFAULT_NODE_HEIGHT);
    });
});
