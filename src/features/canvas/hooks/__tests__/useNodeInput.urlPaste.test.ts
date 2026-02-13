/**
 * useNodeInput URL Detection & Paste Handler Tests
 * Split from useNodeInput.test.ts to stay under 300-line limit.
 * Validates URL extraction from draft content and paste-to-draft pipeline.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeInput } from '../useNodeInput';
import type { CanvasNode } from '../../types/node';

// Mock useLinkPreviewFetch — tested separately
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

describe('useNodeInput URL detection', () => {
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
                    isGenerating: false,
                    submitHandlerRef: { current: null },
                    isNewEmptyNode: false,
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
                    isGenerating: false,
                    submitHandlerRef: { current: null },
                    isNewEmptyNode: false,
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
                    isGenerating: false,
                    submitHandlerRef: { current: null },
                    isNewEmptyNode: false,
                }),
            );

            expect(useLinkPreviewFetch).toHaveBeenCalledWith(NODE_ID, []);
        });
    });

    describe('paste handler for URL detection', () => {
        it('updates draftContent on paste with URL text', async () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const dom = document.createElement('div');
            const editorWithDom = { ...mockEditor, view: { dom } };

            renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: editorWithDom as never,
                    getMarkdown: vi.fn(() => 'existing text https://pasted.com/page'),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    isGenerating: false,
                    submitHandlerRef: { current: null },
                    isNewEmptyNode: false,
                }),
            );

            const pasteEvent = new Event('paste', { bubbles: true });
            act(() => { dom.dispatchEvent(pasteEvent); });
            await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

            expect(useCanvasStore.getState().draftContent).toBe(
                'existing text https://pasted.com/page',
            );
        });

        it('does not attach paste listener when not editing', () => {
            const dom = document.createElement('div');
            const addSpy = vi.spyOn(dom, 'addEventListener');
            const editorWithDom = { ...mockEditor, view: { dom } };

            renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: editorWithDom as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    isGenerating: false,
                    submitHandlerRef: { current: null },
                    isNewEmptyNode: false,
                }),
            );

            expect(addSpy).not.toHaveBeenCalledWith('paste', expect.any(Function));
        });

        it('removes paste listener on unmount', () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const dom = document.createElement('div');
            const removeSpy = vi.spyOn(dom, 'removeEventListener');
            const editorWithDom = { ...mockEditor, view: { dom } };

            const { unmount } = renderHook(() =>
                useNodeInput({
                    nodeId: NODE_ID,
                    editor: editorWithDom as never,
                    getMarkdown: vi.fn(() => ''),
                    setContent: vi.fn(),
                    getEditableContent: vi.fn(() => ''),
                    saveContent: vi.fn(),
                    isGenerating: false,
                    submitHandlerRef: { current: null },
                    isNewEmptyNode: false,
                }),
            );

            unmount();
            expect(removeSpy).toHaveBeenCalledWith('paste', expect.any(Function));
        });
    });
});
