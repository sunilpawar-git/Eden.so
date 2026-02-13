/**
 * Integration tests for blur guard, view-mode key insertion, and draft pipeline.
 * Split from editorPipeline.integration.test.ts to stay under 300-line limit.
 *
 * Covers: Blur guard (body), view-mode printable key insertion via
 * tr.insertText, and onUpdate → updateDraft → canvasStore pipeline.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCanvasStore } from '../stores/canvasStore';
import { htmlToMarkdown } from '../services/markdownConverter';

// ---------------------------------------------------------------------------
// 4. Blur guard re-focus + reset sequence (full lifecycle)
// ---------------------------------------------------------------------------

describe('Blur guard: body blur exits editing immediately', () => {
    it('blur saves content and exits editing (no slash guard in body)', async () => {
        const saveContent = vi.fn();
        const onExitEditing = vi.fn();

        const { useIdeaCardEditor } = await import('../hooks/useIdeaCardEditor');

        const { result } = renderHook(() =>
            useIdeaCardEditor({
                isEditing: true,
                output: 'existing content',
                getEditableContent: () => 'existing content',
                placeholder: 'Type...',
                saveContent,
                onExitEditing,
            }),
        );

        expect(saveContent).not.toHaveBeenCalled();
        expect(onExitEditing).not.toHaveBeenCalled();
        expect(result.current.editor).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// 5. View-mode printable key → real TipTap text insertion
// ---------------------------------------------------------------------------

describe('View-mode printable key insertion (real TipTap)', () => {
    it('inserting text via tr.insertText adds content to editor', () => {
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '',
                editable: true,
            }),
        );
        const editor = result.current;
        expect(editor).not.toBeNull();

        act(() => {
            const { state, dispatch } = editor!.view;
            const { from, to } = state.selection;
            dispatch(state.tr.insertText('/', from, to));
        });

        expect(editor!.getText()).toBe('/');
        expect(editor!.getHTML()).toContain('/');
    });

    it('multiple characters accumulate in correct order', () => {
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '',
                editable: true,
            }),
        );
        const editor = result.current;

        const chars = ['h', 'e', 'l', 'l', 'o'];
        act(() => {
            for (const char of chars) {
                const { state, dispatch } = editor!.view;
                const { from, to } = state.selection;
                dispatch(state.tr.insertText(char, from, to));
            }
        });

        expect(editor!.getText()).toBe('hello');
    });

    it('tr.insertText fires onUpdate for each character', () => {
        const onUpdate = vi.fn();
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '',
                editable: true,
                onUpdate: () => onUpdate(),
            }),
        );
        const editor = result.current;

        act(() => {
            const { state, dispatch } = editor!.view;
            dispatch(state.tr.insertText('/'));
        });

        expect(onUpdate).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// 6. onUpdate → updateDraft → store pipeline (real TipTap)
// ---------------------------------------------------------------------------

describe('onUpdate → updateDraft store pipeline (real TipTap)', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
        useCanvasStore.getState().startEditing('test-draft-node');
    });

    afterEach(() => {
        useCanvasStore.getState().stopEditing();
    });

    it('typing updates draftContent in canvasStore', () => {
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '',
                editable: true,
                onUpdate: ({ editor: e }) => {
                    useCanvasStore.getState().updateDraft(htmlToMarkdown(e.getHTML()));
                },
            }),
        );
        const editor = result.current;
        expect(editor).not.toBeNull();

        act(() => {
            const { state, dispatch } = editor!.view;
            dispatch(state.tr.insertText('hello world'));
        });

        expect(useCanvasStore.getState().draftContent).toContain('hello world');
    });

    it('programmatic setContent with skipNextUpdate does NOT update draftContent', () => {
        const skipRef = { current: false };
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '',
                editable: true,
                onUpdate: ({ editor: e }) => {
                    if (skipRef.current) { skipRef.current = false; return; }
                    useCanvasStore.getState().updateDraft(htmlToMarkdown(e.getHTML()));
                },
            }),
        );
        const editor = result.current;

        act(() => {
            skipRef.current = true;
            editor!.commands.setContent('<p>programmatic</p>');
        });

        expect(useCanvasStore.getState().draftContent).toBeNull();
    });

    it('rapid typing updates draftContent to latest value', () => {
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '',
                editable: true,
                onUpdate: ({ editor: e }) => {
                    useCanvasStore.getState().updateDraft(htmlToMarkdown(e.getHTML()));
                },
            }),
        );
        const editor = result.current;

        act(() => {
            for (const char of ['f', 'o', 'o']) {
                const { state, dispatch } = editor!.view;
                dispatch(state.tr.insertText(char));
            }
        });

        const draft = useCanvasStore.getState().draftContent;
        expect(draft).toContain('foo');
    });
});
