/**
 * useNodeInput Tests
 * TDD: Validates single input router for view-mode → edit-mode transitions,
 * keyboard handling, blur saves, and URL detection for link previews
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeInput } from '../useNodeInput';
import type { CanvasNode } from '../../types/node';

// Mock useLinkPreviewFetch — Phase 1.5 already tested it
vi.mock('../useLinkPreviewFetch', () => ({
    useLinkPreviewFetch: vi.fn(),
}));

const createMockNode = (id: string): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    data: { prompt: '', output: 'existing content', tags: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
});

const createMockEditor = () => ({
    view: { dom: document.createElement('div') },
    commands: { insertContent: vi.fn(), focus: vi.fn(), setContent: vi.fn() },
    setEditable: vi.fn(),
    getHTML: vi.fn(() => '<p>test</p>'),
    isEmpty: false,
});

describe('useNodeInput', () => {
    const NODE_ID = 'node-1';
    let mockEditor: ReturnType<typeof createMockEditor>;

    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.getState().clearCanvas();
        useCanvasStore.getState().addNode(createMockNode(NODE_ID));
        mockEditor = createMockEditor();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('isEditing derivation', () => {
        it('returns isEditing=false when store editingNodeId is null', () => {
            const { result } = renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: mockEditor as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => 'content'),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );
            expect(result.current.isEditing).toBe(false);
        });

        it('returns isEditing=true when store editingNodeId matches nodeId', () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const { result } = renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: mockEditor as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => 'content'),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );
            expect(result.current.isEditing).toBe(true);
        });

        it('returns isEditing=false when another node is being edited', () => {
            useCanvasStore.getState().startEditing('other-node');
            const { result } = renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: mockEditor as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => 'content'),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );
            expect(result.current.isEditing).toBe(false);
        });
    });

    describe('view-mode → edit-mode transitions', () => {
        const renderInViewMode = (overrides = {}) => {
            const opts = {
                nodeId: NODE_ID,
                editor: mockEditor as never,
                getMarkdown: vi.fn(() => ''),
                setContent: vi.fn(),
                getEditableContent: vi.fn(() => 'existing content'),
                saveContent: vi.fn(),
                onSubmitNote: vi.fn(),
                onSubmitAI: vi.fn(),
                suggestionActiveRef: { current: false },
                isGenerating: false,
                ...overrides,
            };
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

        it('printable key calls startEditing and defers insertContent', async () => {
            const { result } = renderInViewMode();
            const event = new KeyboardEvent('keydown', { key: 'a' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);

            // queueMicrotask defers insertContent
            await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
            expect(mockEditor.commands.insertContent).toHaveBeenCalledWith('a');
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
        const renderInEditMode = (overrides = {}) => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const opts = {
                nodeId: NODE_ID,
                editor: mockEditor as never,
                getMarkdown: vi.fn(() => 'draft content'),
                setContent: vi.fn(),
                getEditableContent: vi.fn(() => 'existing content'),
                saveContent: vi.fn(),
                onSubmitNote: vi.fn(),
                onSubmitAI: vi.fn(),
                suggestionActiveRef: { current: false },
                isGenerating: false,
                ...overrides,
            };
            return { ...renderHook(() => useNodeInput(opts)), opts };
        };

        it('Escape saves content and stops editing', () => {
            const { result, opts } = renderInEditMode();
            const event = new KeyboardEvent('keydown', { key: 'Escape' });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(opts.saveContent).toHaveBeenCalledWith('draft content');
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('Enter (no shift, no suggestion) submits note and stops editing', () => {
            const { result, opts } = renderInEditMode();
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(opts.onSubmitNote).toHaveBeenCalledWith('draft content');
        });

        it('Enter in AI mode calls onSubmitAI', () => {
            const { result, opts } = renderInEditMode();
            // Set AI mode after startEditing (which resets to 'note')
            act(() => { useCanvasStore.getState().setInputMode('ai'); });
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(opts.onSubmitAI).toHaveBeenCalledWith('draft content');
        });

        it('Enter with empty content exits editing without submit', () => {
            const { result, opts } = renderInEditMode({
                getMarkdown: vi.fn(() => '   '),
            });
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(opts.onSubmitNote).not.toHaveBeenCalled();
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('Shift+Enter does not submit (allows newline)', () => {
            const { result, opts } = renderInEditMode();
            const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(opts.onSubmitNote).not.toHaveBeenCalled();
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('does not submit when suggestion is active', () => {
            const { result, opts } = renderInEditMode({
                suggestionActiveRef: { current: true },
            });
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

            act(() => { result.current.handleKeyDown(event); });
            expect(opts.onSubmitNote).not.toHaveBeenCalled();
        });
    });

    describe('inputMode derivation', () => {
        it('returns current inputMode from store', () => {
            useCanvasStore.getState().setInputMode('ai');
            const { result } = renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: mockEditor as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );
            expect(result.current.inputMode).toBe('ai');
        });
    });

    describe('URL detection for link previews', () => {
        it('calls useLinkPreviewFetch when draft contains URLs', async () => {
            const { useLinkPreviewFetch } = await import('../useLinkPreviewFetch');
            useCanvasStore.getState().startEditing(NODE_ID);
            useCanvasStore.getState().updateDraft('Check out https://example.com and https://test.org');

            renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: mockEditor as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );

            expect(useLinkPreviewFetch).toHaveBeenCalledWith(
                NODE_ID,
                expect.arrayContaining(['https://example.com', 'https://test.org']),
            );
        });

        it('passes empty array when draft has no URLs', async () => {
            const { useLinkPreviewFetch } = await import('../useLinkPreviewFetch');
            useCanvasStore.getState().startEditing(NODE_ID);
            useCanvasStore.getState().updateDraft('Just plain text');

            renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: mockEditor as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );

            expect(useLinkPreviewFetch).toHaveBeenCalledWith(NODE_ID, []);
        });

        it('does not call useLinkPreviewFetch when not editing', async () => {
            const { useLinkPreviewFetch } = await import('../useLinkPreviewFetch');
            vi.mocked(useLinkPreviewFetch).mockClear();
            useCanvasStore.getState().updateDraft('https://example.com');

            renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: mockEditor as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );

            expect(useLinkPreviewFetch).toHaveBeenCalledWith(NODE_ID, []);
        });
    });

    describe('paste handler for URL detection', () => {
        it('updates draftContent on paste with URL text', async () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const dom = document.createElement('div');
            const editorWithDom = {
                ...mockEditor,
                view: { dom },
            };

            renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: editorWithDom as never,
                    getMarkdown: vi.fn(() => 'existing text https://pasted.com/page'),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );

            // Simulate paste event
            const pasteEvent = new Event('paste', { bubbles: true });
            act(() => { dom.dispatchEvent(pasteEvent); });

            // Wait for queueMicrotask to process
            await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

            // After paste, draftContent should be updated from getMarkdown()
            expect(useCanvasStore.getState().draftContent).toBe(
                'existing text https://pasted.com/page',
            );
        });

        it('does not attach paste listener when not editing', () => {
            const dom = document.createElement('div');
            const addSpy = vi.spyOn(dom, 'addEventListener');
            const editorWithDom = {
                ...mockEditor,
                view: { dom },
            };

            renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: editorWithDom as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );

            expect(addSpy).not.toHaveBeenCalledWith('paste', expect.any(Function));
        });

        it('removes paste listener on unmount', () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const dom = document.createElement('div');
            const removeSpy = vi.spyOn(dom, 'removeEventListener');
            const editorWithDom = {
                ...mockEditor,
                view: { dom },
            };

            const { unmount } = renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: editorWithDom as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    onSubmitNote: vi.fn(),
                    onSubmitAI: vi.fn(),
                    suggestionActiveRef: { current: false },
                    isGenerating: false,
                }),
            );

            unmount();
            expect(removeSpy).toHaveBeenCalledWith('paste', expect.any(Function));
        });
    });
});
