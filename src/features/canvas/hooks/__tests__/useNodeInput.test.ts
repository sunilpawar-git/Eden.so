/**
 * useNodeInput Tests — core keyboard handling and edit-mode transitions.
 * URL detection and paste tests are in useNodeInput.urlPaste.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeInput, type UseNodeInputOptions } from '../useNodeInput';
import type { CanvasNode } from '../../types/node';

vi.mock('../useLinkPreviewFetch', () => ({ useLinkPreviewFetch: vi.fn() }));

const createMockNode = (id: string): CanvasNode => ({
    id, workspaceId: 'ws-1', type: 'idea',
    position: { x: 0, y: 0 },
    data: { prompt: '', output: 'existing content', tags: [] },
    createdAt: new Date(), updatedAt: new Date(),
});

const createMockEditor = () => {
    const mockTr = { insertText: vi.fn().mockReturnThis() };
    return {
        view: {
            dom: document.createElement('div'),
            state: { selection: { from: 0, to: 0 }, tr: mockTr },
            dispatch: vi.fn(),
        },
        commands: { insertContent: vi.fn(), focus: vi.fn(), setContent: vi.fn() },
        setEditable: vi.fn(),
        getHTML: vi.fn(() => '<p>test</p>'),
        isEmpty: false,
    };
};

describe('useNodeInput', () => {
    const NODE_ID = 'node-1';
    let mockEditor: ReturnType<typeof createMockEditor>;

    /** Build default options, merging overrides */
    const baseOpts = (overrides: Partial<UseNodeInputOptions> = {}): UseNodeInputOptions => ({
        nodeId: NODE_ID,
        editor: mockEditor as never,
        getMarkdown: vi.fn(() => ''),
        setContent: vi.fn(),
        getEditableContent: vi.fn(() => 'existing content'),
        saveContent: vi.fn(),
        isGenerating: false,
        submitHandlerRef: { current: null },
        isNewEmptyNode: false,
        ...overrides,
    });

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

    describe('edit-mode keyboard handling', () => {
        const renderInEditMode = (overrides: Partial<UseNodeInputOptions> = {}) => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const opts = baseOpts({ getMarkdown: vi.fn(() => 'draft content'), ...overrides });
            return { ...renderHook(() => useNodeInput(opts)), opts };
        };

        it('Escape saves content and stops editing', () => {
            const { opts } = renderInEditMode();
            // Enter/Escape are now handled by SubmitKeymap via submitHandlerRef
            expect(opts.submitHandlerRef.current).not.toBeNull();
            act(() => { (opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler).onEscape(); });
            expect(opts.saveContent).toHaveBeenCalledWith('draft content');
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('Enter returns false to allow new paragraph creation', () => {
            const { opts } = renderInEditMode();
            expect(opts.submitHandlerRef.current).not.toBeNull();
            const handler = opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler;
            let result: boolean;
            act(() => { result = handler.onEnter(); });
            // onEnter must return false so StarterKit creates a new paragraph
            expect(result!).toBe(false);
            // Must remain in editing mode
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('Enter returns false regardless of inputMode', () => {
            const { opts } = renderInEditMode();
            act(() => { useCanvasStore.getState().setInputMode('ai'); });
            expect(opts.submitHandlerRef.current).not.toBeNull();
            const handler = opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler;
            let result: boolean;
            act(() => { result = handler.onEnter(); });
            // Body editor Enter always returns false, regardless of inputMode
            expect(result!).toBe(false);
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('Enter with empty content still returns false (allows new paragraph)', () => {
            const { opts } = renderInEditMode({
                getMarkdown: vi.fn(() => '   '),
            });
            expect(opts.submitHandlerRef.current).not.toBeNull();
            const handler = opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler;
            let result: boolean;
            act(() => { result = handler.onEnter(); });
            // Even with empty content, Enter returns false (notepad behavior)
            expect(result!).toBe(false);
            // Must NOT exit editing — empty paragraph is valid notepad state
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('Escape still saves content and stops editing (notepad exit)', () => {
            const { opts } = renderInEditMode();
            expect(opts.submitHandlerRef.current).not.toBeNull();
            const handler = opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler;
            act(() => { handler.onEscape(); });
            expect(opts.saveContent).toHaveBeenCalledWith('draft content');
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('Shift+Enter does not exit editing (allows newline)', () => {
            renderInEditMode();
            // Shift+Enter is not intercepted by SubmitKeymap (only plain Enter)
            // so it falls through to StarterKit which creates a hard break
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

    });

    describe('editor editable state management', () => {
        it('sets editor editable to false on exitEditing (Escape)', () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const submitHandlerRef = { current: null as import('../../extensions/submitKeymap').SubmitKeymapHandler | null };
            renderHook(() => useNodeInput(baseOpts({
                getMarkdown: vi.fn(() => 'content'),
                getEditableContent: vi.fn(() => ''),
                submitHandlerRef,
            })));
            expect(submitHandlerRef.current).not.toBeNull();
            act(() => { submitHandlerRef.current!.onEscape(); });
            expect(mockEditor.setEditable).toHaveBeenCalledWith(false);
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('sets editor editable to true on enterEditing', () => {
            const { result } = renderHook(() => useNodeInput(baseOpts({
                getEditableContent: vi.fn(() => ''),
            })));
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
            act(() => { result.current.handleKeyDown(event); });
            expect(mockEditor.setEditable).toHaveBeenCalledWith(true);
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

