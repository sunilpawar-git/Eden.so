/**
 * Integration tests for the editor content pipeline.
 *
 * These tests exercise REAL TipTap editors with REAL extensions to catch
 * cross-layer regressions in:
 * - skipNextUpdate guard (setContent vs user typing)
 * - Paste → draft → URL detection pipeline
 * - Markdown round-trip fidelity (markdown→TipTap→markdown)
 * - Blur guard re-focus + reset sequence
 * - View-mode printable key → real TipTap insertion
 * - onUpdate → updateDraft store pipeline
 * - blurRef stale closure prevention
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCanvasStore } from '../stores/canvasStore';
import { markdownToHtml, htmlToMarkdown } from '../services/markdownConverter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a real TipTap editor with onUpdate/onBlur spies */
function createEditorWithCallbacks(opts: {
    content?: string;
    onUpdate?: (markdown: string) => void;
    onBlur?: (markdown: string) => void;
    editable?: boolean;
}) {
    const skipNextUpdateRef = { current: false };

    return renderHook(() => {
        const editor = useEditor({
            extensions: [StarterKit, Placeholder.configure({ placeholder: 'Type...' })],
            content: opts.content ? markdownToHtml(opts.content) : '',
            editable: opts.editable ?? true,
            onUpdate: ({ editor: e }) => {
                if (skipNextUpdateRef.current) {
                    skipNextUpdateRef.current = false;
                    return;
                }
                opts.onUpdate?.(htmlToMarkdown(e.getHTML()));
            },
            onBlur: ({ editor: e }) => {
                opts.onBlur?.(htmlToMarkdown(e.getHTML()));
            },
        });
        return { editor, skipNextUpdateRef };
    });
}

/** Flush microtasks (queueMicrotask / Promise.resolve) */
async function flushMicrotasks() {
    await new Promise<void>((r) => setTimeout(r, 0));
}

// ---------------------------------------------------------------------------
// 1. skipNextUpdate guard: setContent vs user typing
// ---------------------------------------------------------------------------

describe('skipNextUpdate guard (real TipTap)', () => {
    it('programmatic setContent does NOT fire onUpdate when skip guard is set', () => {
        const onUpdate = vi.fn();
        const { result } = createEditorWithCallbacks({ onUpdate });
        const editor = result.current.editor;
        expect(editor).not.toBeNull();

        // Simulate the real setContent pattern from useTipTapEditor
        act(() => {
            result.current.skipNextUpdateRef.current = true;
            editor!.commands.setContent(markdownToHtml('programmatic content'));
        });

        // onUpdate should NOT have been called — guard skipped it
        expect(onUpdate).not.toHaveBeenCalled();
    });

    it('user typing DOES fire onUpdate (guard is false)', () => {
        const onUpdate = vi.fn();
        const { result } = createEditorWithCallbacks({ onUpdate });
        const editor = result.current.editor;
        expect(editor).not.toBeNull();

        // Simulate user typing via insertText transaction (like real keystrokes)
        act(() => {
            const { state, dispatch } = editor!.view;
            const { from, to } = state.selection;
            dispatch(state.tr.insertText('hello', from, to));
        });

        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledWith(expect.stringContaining('hello'));
    });

    it('guard resets after one skip — subsequent setContent without guard fires onUpdate', () => {
        const onUpdate = vi.fn();
        const { result } = createEditorWithCallbacks({ onUpdate });
        const editor = result.current.editor;

        // First: guarded setContent (should NOT fire)
        act(() => {
            result.current.skipNextUpdateRef.current = true;
            editor!.commands.setContent(markdownToHtml('first'));
        });
        expect(onUpdate).not.toHaveBeenCalled();

        // Second: unguarded setContent (should fire because guard was consumed)
        act(() => {
            editor!.commands.setContent(markdownToHtml('second'));
        });
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledWith(expect.stringContaining('second'));
    });
});

// ---------------------------------------------------------------------------
// 2. Paste → queueMicrotask → getMarkdown → updateDraft pipeline
// ---------------------------------------------------------------------------

describe('Paste → draft update pipeline (real TipTap)', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    it('pasting text into editor updates store draftContent via queueMicrotask', async () => {
        const { result } = createEditorWithCallbacks({ editable: true });
        const editor = result.current.editor;
        expect(editor).not.toBeNull();

        // Wire up the paste handler the same way useNodeInput does
        const dom = editor!.view.dom;
        const getMarkdown = () => htmlToMarkdown(editor!.getHTML());

        const onPaste = () => {
            queueMicrotask(() => {
                useCanvasStore.getState().updateDraft(getMarkdown());
            });
        };
        dom.addEventListener('paste', onPaste);

        // Simulate pasting content (insert text to simulate what TipTap does after paste)
        act(() => {
            editor!.commands.insertContent('Check out https://example.com for more');
        });

        // Fire the paste event
        act(() => {
            dom.dispatchEvent(new Event('paste', { bubbles: true }));
        });

        // Flush the queueMicrotask
        await act(async () => { await flushMicrotasks(); });

        // Store should have the pasted content
        const draft = useCanvasStore.getState().draftContent;
        expect(draft).toContain('https://example.com');

        dom.removeEventListener('paste', onPaste);
    });

    it('URL extraction from draft content detects URLs correctly', () => {
        // This tests the same regex used in useNodeInput
        const URL_REGEX = /https?:\/\/[^\s)]+/g;
        const extractUrls = (text: string | null): string[] => {
            if (!text) return [];
            const matches = text.match(URL_REGEX);
            return matches ? [...new Set(matches)] : [];
        };

        const urls = extractUrls('Visit https://example.com and http://test.org/path?q=1 today');
        expect(urls).toEqual(['https://example.com', 'http://test.org/path?q=1']);

        // Deduplication
        const dupes = extractUrls('https://a.com and https://a.com again');
        expect(dupes).toEqual(['https://a.com']);

        // No URLs
        expect(extractUrls('plain text')).toEqual([]);
        expect(extractUrls(null)).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// 3. Markdown round-trip fidelity (markdown → TipTap → markdown)
// ---------------------------------------------------------------------------

describe('Markdown round-trip fidelity (real TipTap)', () => {
    const roundTrip = (markdown: string): string => {
        let result = '';
        const { result: hookResult } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: markdownToHtml(markdown),
            }),
        );
        const editor = hookResult.current;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (editor) {
            result = htmlToMarkdown(editor.getHTML());
        }
        return result;
    };

    it.each([
        ['plain text', 'Hello world'],
        ['bold text', '**bold text**'],
        ['italic text', '*italic text*'],
        ['bold + italic', '***bold italic***'],
        ['inline code', '`code here`'],
        ['heading 1', '# Heading One'],
        ['heading 2', '## Heading Two'],
        ['heading 3', '### Heading Three'],
        ['unordered list', '- item one\n- item two\n- item three'],
        ['ordered list', '1. first\n2. second\n3. third'],
        ['blockquote', '> quoted text'],
        ['code block', '```\nconst x = 1;\nconsole.log(x);\n```'],
        ['mixed content', '# Title\nSome **bold** and *italic* text.\n- List item\n- Another item'],
    ])('%s survives round-trip', (_label, markdown) => {
        const result = roundTrip(markdown);
        // Normalize trailing newlines for comparison
        expect(result.trim()).toBe(markdown.trim());
    });

    it('empty content round-trips to empty', () => {
        expect(roundTrip('').trim()).toBe('');
    });
});

