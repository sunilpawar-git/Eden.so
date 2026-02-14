/**
 * Canvas Store NodeUX Tests — TDD RED phase
 * Tests for toggleNodePinned and toggleNodeCollapsed actions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';

/** Helper: create a minimal node for testing */
function createTestNode(id: string, overrides: Partial<CanvasNode['data']> = {}): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        data: { heading: `Node ${id}`, output: 'content', ...overrides },
        position: { x: 0, y: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

describe('canvasStore — NodeUX actions', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [
                createTestNode('node-1'),
                createTestNode('node-2', { isPinned: true }),
                createTestNode('node-3', { isCollapsed: true }),
            ],
            edges: [],
            selectedNodeIds: new Set(),
            editingNodeId: null,
            draftContent: null,
            inputMode: 'note',
        });
    });

    describe('toggleNodePinned', () => {
        it('flips isPinned from undefined to true', () => {
            useCanvasStore.getState().toggleNodePinned('node-1');
            const node = useCanvasStore.getState().nodes.find((n) => n.id === 'node-1');
            expect(node?.data.isPinned).toBe(true);
        });

        it('flips isPinned from true to false', () => {
            useCanvasStore.getState().toggleNodePinned('node-2');
            const node = useCanvasStore.getState().nodes.find((n) => n.id === 'node-2');
            expect(node?.data.isPinned).toBe(false);
        });

        it('does not affect other nodes (isolation)', () => {
            useCanvasStore.getState().toggleNodePinned('node-1');
            const node2 = useCanvasStore.getState().nodes.find((n) => n.id === 'node-2');
            expect(node2?.data.isPinned).toBe(true); // unchanged
        });

        it('is a no-op for non-existent nodeId', () => {
            const nodesBefore = useCanvasStore.getState().nodes;
            useCanvasStore.getState().toggleNodePinned('nonexistent');
            const nodesAfter = useCanvasStore.getState().nodes;
            expect(nodesAfter).toEqual(nodesBefore);
        });
    });

    describe('toggleNodeCollapsed', () => {
        it('flips isCollapsed from undefined to true', () => {
            useCanvasStore.getState().toggleNodeCollapsed('node-1');
            const node = useCanvasStore.getState().nodes.find((n) => n.id === 'node-1');
            expect(node?.data.isCollapsed).toBe(true);
        });

        it('flips isCollapsed from true to false', () => {
            useCanvasStore.getState().toggleNodeCollapsed('node-3');
            const node = useCanvasStore.getState().nodes.find((n) => n.id === 'node-3');
            expect(node?.data.isCollapsed).toBe(false);
        });

        it('does not affect other nodes (isolation)', () => {
            useCanvasStore.getState().toggleNodeCollapsed('node-1');
            const node3 = useCanvasStore.getState().nodes.find((n) => n.id === 'node-3');
            expect(node3?.data.isCollapsed).toBe(true); // unchanged
        });

        it('is a no-op for non-existent nodeId', () => {
            const nodesBefore = useCanvasStore.getState().nodes;
            useCanvasStore.getState().toggleNodeCollapsed('nonexistent');
            const nodesAfter = useCanvasStore.getState().nodes;
            expect(nodesAfter).toEqual(nodesBefore);
        });
    });
});
