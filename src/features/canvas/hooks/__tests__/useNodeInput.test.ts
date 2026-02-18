/**
 * useNodeInput Tests — core keyboard handling and view-mode transitions.
 * Edit-mode tests: useNodeInput.editMode.test.ts
 * URL detection & paste: useNodeInput.urlPaste.test.ts
 * Global key reservation: useNodeInput.globalKeys.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeInput, type UseNodeInputOptions } from '../useNodeInput';
import { NODE_ID, createMockNode, createMockEditor, buildBaseOpts } from './nodeInputTestHelpers';

vi.mock('../useLinkPreviewFetch', () => ({ useLinkPreviewFetch: vi.fn() }));

describe('useNodeInput', () => {
    let mockEditor: ReturnType<typeof createMockEditor>;
    const baseOpts = (overrides: Partial<UseNodeInputOptions> = {}) =>
        buildBaseOpts(mockEditor, overrides);

    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.getState().clearCanvas();
        useCanvasStore.getState().addNode(createMockNode(NODE_ID));
        mockEditor = createMockEditor();
    });

    afterEach(() => { vi.restoreAllMocks(); });

    describe('isEditing derivation', () => {
        it('returns isEditing=false when store editingNodeId is null', () => {
            const { result } = renderHook(() => useNodeInput(baseOpts()));
            expect(result.current.isEditing).toBe(false);
        });

        it('returns isEditing=true when store editingNodeId matches nodeId', () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const { result } = renderHook(() => useNodeInput(baseOpts()));
            expect(result.current.isEditing).toBe(true);
        });

        it('returns isEditing=false when another node is being edited', () => {
            useCanvasStore.getState().startEditing('other-node');
            const { result } = renderHook(() => useNodeInput(baseOpts()));
            expect(result.current.isEditing).toBe(false);
        });
    });

    describe('view-mode → edit-mode transitions', () => {
        const renderInViewMode = (overrides: Partial<UseNodeInputOptions> = {}) => {
            const opts = baseOpts(overrides);
            return { ...renderHook(() => useNodeInput(opts)), opts };
        };

        it('Enter key calls store.startEditing', () => {
            const { result } = renderInViewMode();
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('Enter key sets editor content from getEditableContent', () => {
            const setContent = vi.fn();
            const { result } = renderInViewMode({ setContent });
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(setContent).toHaveBeenCalledWith('existing content');
        });

        it('printable key calls startEditing and defers text insertion', async () => {
            const { result } = renderInViewMode();
            const event = new KeyboardEvent('keydown', { key: 'a' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);

            // queueMicrotask defers text insertion via ProseMirror transaction
            await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
            expect(mockEditor.view.state.tr.insertText).toHaveBeenCalledWith('a', 0, 0);
            expect(mockEditor.view.dispatch).toHaveBeenCalled();
        });

        it('ignores modifier keys (ctrl, meta, alt) in view mode', () => {
            const { result } = renderInViewMode();
            const events = [
                new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }),
                new KeyboardEvent('keydown', { key: 'a', metaKey: true }),
                new KeyboardEvent('keydown', { key: 'a', altKey: true }),
            ];

            events.forEach((e) => {
                act(() => { result.current.handleKeyDown(e); });
            });
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('ignores keys when isGenerating is true', () => {
            const { result } = renderInViewMode({ isGenerating: true });
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('double-click calls startEditing', () => {
            const { result } = renderInViewMode();
            act(() => { result.current.handleDoubleClick(); });
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('double-click does nothing when generating', () => {
            const { result } = renderInViewMode({ isGenerating: true });
            act(() => { result.current.handleDoubleClick(); });
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });
    });

    describe('shortcuts in view mode', () => {
        it('fires shortcut handler instead of entering edit mode', () => {
            const onTag = vi.fn();
            const { result } = renderHook(() => useNodeInput(baseOpts({
                shortcuts: { t: onTag },
            })));

            const event = new KeyboardEvent('keydown', { key: 't' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
            act(() => { result.current.handleKeyDown(event); });

            expect(onTag).toHaveBeenCalledTimes(1);
            // Should NOT enter editing
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('is case-insensitive (T maps to t handler)', () => {
            const onTag = vi.fn();
            const { result } = renderHook(() => useNodeInput(baseOpts({
                shortcuts: { t: onTag },
            })));

            const event = new KeyboardEvent('keydown', { key: 'T' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
            act(() => { result.current.handleKeyDown(event); });

            expect(onTag).toHaveBeenCalledTimes(1);
        });

        it('falls through to edit mode for non-shortcut keys', () => {
            const onTag = vi.fn();
            const { result } = renderHook(() => useNodeInput(baseOpts({
                shortcuts: { t: onTag },
                getEditableContent: vi.fn(() => ''),
            })));

            const event = new KeyboardEvent('keydown', { key: 'x' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
            act(() => { result.current.handleKeyDown(event); });

            expect(onTag).not.toHaveBeenCalled();
            // Should enter editing
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('does not fire shortcuts in edit mode', () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const onTag = vi.fn();
            const { result } = renderHook(() => useNodeInput(baseOpts({
                shortcuts: { t: onTag },
            })));

            const event = new KeyboardEvent('keydown', { key: 't' });
            act(() => { result.current.handleKeyDown(event); });

            expect(onTag).not.toHaveBeenCalled();
        });
    });
});

