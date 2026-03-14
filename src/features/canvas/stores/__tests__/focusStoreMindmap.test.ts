/**
 * enterFocusWithEditing — content-mode-aware focus entry tests.
 *
 * Text nodes → focus + start editing (ready to type).
 * Mindmap nodes → focus in view-only mode (mindmap visible; double-click to edit).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useFocusStore, enterFocusWithEditing } from '../focusStore';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode } from '../../types/node';

const makeNode = (id: string, contentMode?: 'text' | 'mindmap'): CanvasNode => ({
    id, workspaceId: 'ws-1', type: 'idea',
    data: { heading: 'Test', output: '# Topic\n- A', contentMode },
    position: { x: 0, y: 0 }, width: 500, height: 400,
    createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
});

function seedStore(nodes: CanvasNode[]) {
    useCanvasStore.setState({
        nodes, edges: [], selectedNodeIds: new Set(),
        editingNodeId: null, draftContent: null, inputMode: 'note',
    });
    useFocusStore.setState({ focusedNodeId: null });
}

describe('enterFocusWithEditing — content-mode-aware', () => {
    beforeEach(() => {
        seedStore([
            makeNode('text-node', 'text'),
            makeNode('mindmap-node', 'mindmap'),
            makeNode('legacy-node'),        // undefined contentMode
        ]);
    });

    it('sets focusedNodeId for a text node', () => {
        enterFocusWithEditing('text-node');
        expect(useFocusStore.getState().focusedNodeId).toBe('text-node');
    });

    it('starts editing for a text node', () => {
        enterFocusWithEditing('text-node');
        expect(useCanvasStore.getState().editingNodeId).toBe('text-node');
    });

    it('sets focusedNodeId for a mindmap node', () => {
        enterFocusWithEditing('mindmap-node');
        expect(useFocusStore.getState().focusedNodeId).toBe('mindmap-node');
    });

    it('does NOT start editing for a mindmap node (view-only focus)', () => {
        enterFocusWithEditing('mindmap-node');
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    it('starts editing for a legacy node (undefined contentMode)', () => {
        enterFocusWithEditing('legacy-node');
        expect(useCanvasStore.getState().editingNodeId).toBe('legacy-node');
    });

    it('starts editing for a non-existent node (defensive)', () => {
        enterFocusWithEditing('ghost');
        expect(useFocusStore.getState().focusedNodeId).toBe('ghost');
        expect(useCanvasStore.getState().editingNodeId).toBe('ghost');
    });
});
