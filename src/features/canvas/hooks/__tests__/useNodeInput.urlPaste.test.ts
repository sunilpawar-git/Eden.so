/**
 * useNodeInput URL Detection & Paste Handler Tests
 * Validates URL extraction from draft content and paste-to-draft pipeline.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeInput, extractUrls } from '../useNodeInput';
import { NODE_ID, createMockNode, createMockEditor } from './nodeInputTestHelpers';

vi.mock('../useLinkPreviewFetch', () => ({
    useLinkPreviewFetch: vi.fn(),
}));

describe('extractUrls', () => {
    it('extracts http and https URLs', () => {
        expect(extractUrls('Visit https://example.com and http://test.org')).toEqual([
            'https://example.com', 'http://test.org',
        ]);
    });

    it('deduplicates identical URLs', () => {
        expect(extractUrls('https://a.com and https://a.com again')).toEqual(['https://a.com']);
    });

    it('returns empty array for null or no-URL text', () => {
        expect(extractUrls(null)).toEqual([]);
        expect(extractUrls('plain text')).toEqual([]);
    });

    it('excludes URLs inside markdown image syntax ![alt](url)', () => {
        const md = '![photo](https://firebasestorage.googleapis.com/v0/b/proj/img.png?alt=media)';
        expect(extractUrls(md)).toEqual([]);
    });

    it('excludes Firebase Storage image URLs but keeps regular links', () => {
        const md = 'Visit https://example.com\n\n![img](https://firebasestorage.googleapis.com/v0/b/proj/pic.jpg)';
        expect(extractUrls(md)).toEqual(['https://example.com']);
    });

    it('excludes data:image base64 URLs that appear in markdown images', () => {
        const md = '![inline](data:image/png;base64,iVBOR) and https://real-link.com';
        expect(extractUrls(md)).toEqual(['https://real-link.com']);
    });

    it('handles multiple images and links mixed together', () => {
        const md = [
            'See https://blog.com/post',
            '![a](https://storage.example.com/a.jpg)',
            'Also https://docs.example.com',
            '![b](https://storage.example.com/b.png)',
        ].join('\n');
        expect(extractUrls(md)).toEqual(['https://blog.com/post', 'https://docs.example.com']);
    });

    it('handles image URL that also appears as standalone link', () => {
        const url = 'https://firebasestorage.googleapis.com/v0/b/proj/img.png';
        const md = `![photo](${url})\n\nDirect link: ${url}`;
        expect(extractUrls(md)).toEqual([]);
    });
});

describe('useNodeInput URL detection', () => {
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
                    isEditing: true,
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
                    isEditing: true,
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
                    isEditing: false,
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
                    isEditing: true,
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
                    isEditing: false,
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
                    isEditing: true,
                }),
            );

            unmount();
            expect(removeSpy).toHaveBeenCalledWith('paste', expect.any(Function));
        });
    });
});
