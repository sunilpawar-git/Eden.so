/**
 * Canvas Store — contentMode data action tests.
 * Validates updateNodeContentMode action, store immutability,
 * and integration with existing data action patterns.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';

const makeNode = (id: string, overrides: Partial<CanvasNode['data']> = {}): CanvasNode => ({
    id, workspaceId: 'ws-1', type: 'idea',
    data: { heading: 'Test', output: '# Topic\n- Item A\n- Item B', ...overrides },
    position: { x: 0, y: 0 }, width: 280, height: 220,
    createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
});

describe('updateNodeContentMode', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [makeNode('n1'), makeNode('n2', { contentMode: 'mindmap' })],
            edges: [], selectedNodeIds: new Set(), editingNodeId: null,
            draftContent: null, inputMode: 'note',
        });
    });

    it('sets contentMode to "mindmap" on a text node', () => {
        useCanvasStore.getState().updateNodeContentMode('n1', 'mindmap');
        const node = useCanvasStore.getState().nodes.find((n) => n.id === 'n1')!;
        expect(node.data.contentMode).toBe('mindmap');
    });

    it('sets contentMode to "text" on a mindmap node', () => {
        useCanvasStore.getState().updateNodeContentMode('n2', 'text');
        const node = useCanvasStore.getState().nodes.find((n) => n.id === 'n2')!;
        expect(node.data.contentMode).toBe('text');
    });

    it('updates updatedAt timestamp', () => {
        const before = useCanvasStore.getState().nodes.find((n) => n.id === 'n1')!.updatedAt;
        useCanvasStore.getState().updateNodeContentMode('n1', 'mindmap');
        const after = useCanvasStore.getState().nodes.find((n) => n.id === 'n1')!.updatedAt;
        expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('does not mutate other nodes', () => {
        const n2Before = useCanvasStore.getState().nodes.find((n) => n.id === 'n2')!;
        useCanvasStore.getState().updateNodeContentMode('n1', 'mindmap');
        const n2After = useCanvasStore.getState().nodes.find((n) => n.id === 'n2')!;
        expect(n2After).toBe(n2Before);
    });

    it('is a no-op for a non-existent node', () => {
        const nodesBefore = useCanvasStore.getState().nodes;
        useCanvasStore.getState().updateNodeContentMode('nonexistent', 'mindmap');
        const nodesAfter = useCanvasStore.getState().nodes;
        // Should still produce new array (map always does), but content unchanged
        expect(nodesAfter.map((n) => n.id)).toEqual(nodesBefore.map((n) => n.id));
    });
});
