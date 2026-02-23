/**
 * Node Shortcuts Integration Tests
 * Verifies that keyboard shortcuts at the document level correctly
 * trigger canvas store actions when a node is selected.
 *
 * This tests the full chain:
 *   document keydown → useNodeShortcuts → callback → canvasStore mutation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeShortcuts } from '../useNodeShortcuts';
import type { CanvasNode } from '../../types/node';

vi.mock('../useLinkPreviewFetch', () => ({ useLinkPreviewFetch: vi.fn() }));

const createTestNode = (id: string): CanvasNode => ({
    id, workspaceId: 'ws-1', type: 'idea',
    position: { x: 0, y: 0 },
    data: {
        prompt: 'Test', output: 'Test output',
        isGenerating: false, isPromptCollapsed: false,
        isPinned: false, isCollapsed: false,
    },
    createdAt: new Date(), updatedAt: new Date(),
});

/** Fire keydown at document level (simulates user pressing a key) */
function pressKeyGlobal(key: string) {
    act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key, bubbles: true, cancelable: true,
        }));
    });
}

describe('Node Shortcuts Integration', () => {
    const NODE_ID = 'test-node-1';

    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.getState().clearCanvas();
        useCanvasStore.getState().addNode(createTestNode(NODE_ID));
        useCanvasStore.setState({ editingNodeId: null });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Collapse shortcut (C key)', () => {
        it('toggles isCollapsed on selected node when C is pressed', () => {
            const toggleCollapse = vi.fn(() => {
                useCanvasStore.getState().toggleNodeCollapsed(NODE_ID);
            });

            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                c: toggleCollapse,
            }));

            // Initially not collapsed
            const nodeBefore = useCanvasStore.getState().nodes.find(n => n.id === NODE_ID);
            expect(nodeBefore?.data.isCollapsed).toBe(false);

            // Press C
            pressKeyGlobal('c');

            // Should now be collapsed
            const nodeAfter = useCanvasStore.getState().nodes.find(n => n.id === NODE_ID);
            expect(nodeAfter?.data.isCollapsed).toBe(true);
        });

        it('toggles back to expanded on second C press', () => {
            const toggleCollapse = vi.fn(() => {
                useCanvasStore.getState().toggleNodeCollapsed(NODE_ID);
            });

            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                c: toggleCollapse,
            }));

            pressKeyGlobal('c'); // collapse
            pressKeyGlobal('c'); // expand

            const node = useCanvasStore.getState().nodes.find(n => n.id === NODE_ID);
            expect(node?.data.isCollapsed).toBe(false);
        });

        it('does NOT toggle collapse when node is not selected', () => {
            const toggleCollapse = vi.fn(() => {
                useCanvasStore.getState().toggleNodeCollapsed(NODE_ID);
            });

            renderHook(() => useNodeShortcuts(NODE_ID, false, {
                c: toggleCollapse,
            }));

            pressKeyGlobal('c');

            const node = useCanvasStore.getState().nodes.find(n => n.id === NODE_ID);
            expect(node?.data.isCollapsed).toBe(false);
        });

        it('does NOT toggle collapse when in edit mode', () => {
            useCanvasStore.setState({ editingNodeId: NODE_ID });

            const toggleCollapse = vi.fn(() => {
                useCanvasStore.getState().toggleNodeCollapsed(NODE_ID);
            });

            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                c: toggleCollapse,
            }));

            pressKeyGlobal('c');

            const node = useCanvasStore.getState().nodes.find(n => n.id === NODE_ID);
            expect(node?.data.isCollapsed).toBe(false);
        });
    });

    describe('Tags shortcut (T key)', () => {
        it('fires tag handler when T is pressed on selected node', () => {
            const onTagOpen = vi.fn();
            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                t: onTagOpen,
            }));

            pressKeyGlobal('t');
            expect(onTagOpen).toHaveBeenCalledTimes(1);
        });

        it('does NOT fire tag handler during editing', () => {
            useCanvasStore.setState({ editingNodeId: NODE_ID });

            const onTagOpen = vi.fn();
            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                t: onTagOpen,
            }));

            pressKeyGlobal('t');
            expect(onTagOpen).not.toHaveBeenCalled();
        });
    });

    describe('Focus shortcut (F key)', () => {
        it('fires focus handler when F is pressed on selected node', () => {
            const onFocus = vi.fn();
            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                f: onFocus,
            }));

            pressKeyGlobal('f');
            expect(onFocus).toHaveBeenCalledTimes(1);
        });

        it('does NOT fire focus handler during editing', () => {
            useCanvasStore.setState({ editingNodeId: NODE_ID });

            const onFocus = vi.fn();
            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                f: onFocus,
            }));

            pressKeyGlobal('f');
            expect(onFocus).not.toHaveBeenCalled();
        });
    });

    describe('Multiple shortcuts coexist', () => {
        it('T and C shortcuts work independently on the same node', () => {
            const onTagOpen = vi.fn();
            const toggleCollapse = vi.fn(() => {
                useCanvasStore.getState().toggleNodeCollapsed(NODE_ID);
            });

            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                t: onTagOpen,
                c: toggleCollapse,
            }));

            pressKeyGlobal('t');
            expect(onTagOpen).toHaveBeenCalledTimes(1);

            pressKeyGlobal('c');
            expect(toggleCollapse).toHaveBeenCalledTimes(1);

            const node = useCanvasStore.getState().nodes.find(n => n.id === NODE_ID);
            expect(node?.data.isCollapsed).toBe(true);
        });

        it('T, C, and F shortcuts work independently on the same node', () => {
            const onTagOpen = vi.fn();
            const toggleCollapse = vi.fn();
            const onFocus = vi.fn();

            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                t: onTagOpen,
                c: toggleCollapse,
                f: onFocus,
            }));

            pressKeyGlobal('f');
            expect(onFocus).toHaveBeenCalledTimes(1);
            expect(onTagOpen).not.toHaveBeenCalled();
            expect(toggleCollapse).not.toHaveBeenCalled();
        });

        it('non-shortcut keys do not trigger any handler', () => {
            const onTagOpen = vi.fn();
            const toggleCollapse = vi.fn();

            renderHook(() => useNodeShortcuts(NODE_ID, true, {
                t: onTagOpen,
                c: toggleCollapse,
            }));

            pressKeyGlobal('x');
            pressKeyGlobal('z');
            pressKeyGlobal('1');

            expect(onTagOpen).not.toHaveBeenCalled();
            expect(toggleCollapse).not.toHaveBeenCalled();
        });
    });
});
