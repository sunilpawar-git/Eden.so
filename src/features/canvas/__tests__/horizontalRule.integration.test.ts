/**
 * Integration tests — Horizontal rule (---) pipeline.
 *
 * Covers the full path from user typing "---" to a rendered <hr> divider:
 *   1. markdownToHtml('---')         → produces <hr> HTML
 *   2. htmlToMarkdown('<hr/>')        → produces '---' markdown
 *   3. Round-trip through TipTap     → HR survives import/export
 *   4. Typing '---' in real editor    → input rule creates <hr> node
 *   5. Focus-mode editor (SubmitKeymap) does not block the input rule
 *
 * Regressions these tests prevent:
 *   - Input rule silently stops firing (TipTap upgrade / extension conflict)
 *   - htmlToMarkdown omits HR, breaking content persistence
 *   - markdownToHtml mis-parses '---' as Setext h2 when adjacent to text
 *   - SubmitKeymap priority inadvertently swallowing text input events
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { SubmitKeymap, type SubmitKeymapHandler } from '../extensions/submitKeymap';
import { markdownToHtml, htmlToMarkdown } from '../services/markdownConverter';
import { useTipTapEditor } from '../hooks/useTipTapEditor';
import type { Editor } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate one character of user input via ProseMirror handleTextInput prop */
function typeChar(editor: Editor, char: string): boolean {
    const from = editor.state.selection.from;
    const handled = (editor.view.someProp('handleTextInput', (f) =>
        f(editor.view, from, from, char, () => editor.state.tr),
    ) as boolean | undefined) ?? false;
    if (!handled) {
        editor.commands.insertContent(char);
    }
    return handled;
}

/** Type a full string one character at a time, returning true if ANY char triggered a rule */
function typeString(editor: Editor, text: string): boolean {
    let anyHandled = false;
    for (const ch of text) {
        if (typeChar(editor, ch)) anyHandled = true;
    }
    return anyHandled;
}

// ---------------------------------------------------------------------------
// 1. Markdown converter — standalone unit
// ---------------------------------------------------------------------------

describe('markdownConverter — horizontal rule', () => {
    it('markdownToHtml converts standalone --- to <hr>', () => {
        const html = markdownToHtml('---');
        expect(html).toMatch(/<hr/i);
    });

    it('markdownToHtml does NOT parse --- after a text line as Setext h2', () => {
        // A blank line must separate paragraph from thematic break
        const html = markdownToHtml('Some text\n\n---');
        expect(html).toMatch(/<hr/i);
        expect(html).not.toMatch(/<h2/i);
    });

    it('htmlToMarkdown converts <hr> to ---', () => {
        const md = htmlToMarkdown('<hr>');
        expect(md.trim()).toBe('---');
    });

    it('htmlToMarkdown emits blank line before --- when preceded by a paragraph', () => {
        const md = htmlToMarkdown('<p>Some text</p><hr>');
        expect(md).toContain('\n\n---');
    });

    it('round-trip: --- markdown → TipTap HTML → markdown stays as ---', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '---', placeholder: '' }),
        );
        const editor = result.current.editor!;
        expect(editor.getHTML()).toMatch(/<hr/i);
        expect(htmlToMarkdown(editor.getHTML()).trim()).toBe('---');
    });

    it('round-trip: paragraph + --- → TipTap → markdown preserves both', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'Hello\n\n---', placeholder: '' }),
        );
        const editor = result.current.editor!;
        const md = htmlToMarkdown(editor.getHTML());
        expect(md).toContain('Hello');
        expect(md).toContain('---');
        expect(md).not.toMatch(/<h2/i);
    });
});

// ---------------------------------------------------------------------------
// 2. HorizontalRule input rule — real TipTap editor
// ---------------------------------------------------------------------------

describe('HorizontalRule input rule (real TipTap)', () => {
    it('typing --- on an empty line triggers the HR input rule', () => {
        const { result } = renderHook(() =>
            useEditor({ extensions: [StarterKit], content: '', editable: true }),
        );
        const editor = result.current!;

        let ruleTriggered = false;
        act(() => {
            ruleTriggered = typeString(editor, '---');
        });

        expect(ruleTriggered).toBe(true);
        expect(editor.getHTML()).toMatch(/<hr/i);
        expect(editor.getHTML()).not.toContain('---'); // text '---' should be gone
    });

    it('typing --- on a new paragraph after existing content creates HR', () => {
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '<p>Some text</p><p></p>',
                editable: true,
            }),
        );
        const editor = result.current!;

        // Move cursor to start of second (empty) paragraph
        act(() => {
            editor.commands.focus('end');
        });

        let ruleTriggered = false;
        act(() => {
            ruleTriggered = typeString(editor, '---');
        });

        expect(ruleTriggered).toBe(true);
        expect(editor.getHTML()).toMatch(/<hr/i);
    });

    it('the HR node round-trips to --- after the input rule fires', () => {
        const { result } = renderHook(() =>
            useEditor({ extensions: [StarterKit], content: '', editable: true }),
        );
        const editor = result.current!;

        act(() => { typeString(editor, '---'); });

        const md = htmlToMarkdown(editor.getHTML());
        expect(md.trim()).toBe('---');
    });
});

// ---------------------------------------------------------------------------
// 3. Focus-mode editor — SubmitKeymap must not block input rules
// ---------------------------------------------------------------------------

describe('HorizontalRule input rule with SubmitKeymap (focus-mode regression)', () => {
    let submitHandlerRef: { current: SubmitKeymapHandler | null };

    beforeEach(() => {
        // Focus-mode wiring: Enter is a no-op, Escape exits
        submitHandlerRef = {
            current: {
                onEnter: () => false,   // do NOT consume Enter
                onEscape: () => true,
            },
        };
    });

    it('typing --- with SubmitKeymap present still triggers the HR input rule', () => {
        const { result } = renderHook(() =>
            useEditor({
                extensions: [
                    StarterKit,
                    SubmitKeymap.configure({ handlerRef: submitHandlerRef }),
                ],
                content: '',
                editable: true,
            }),
        );
        const editor = result.current!;

        let ruleTriggered = false;
        act(() => {
            ruleTriggered = typeString(editor, '---');
        });

        expect(ruleTriggered).toBe(true);
        expect(editor.getHTML()).toMatch(/<hr/i);
    });

    it('useTipTapEditor (production hook) creates HR on --- input', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: '' }),
        );
        const editor = result.current.editor!;

        let ruleTriggered = false;
        act(() => {
            ruleTriggered = typeString(editor, '---');
        });

        expect(ruleTriggered).toBe(true);
        expect(editor.getHTML()).toMatch(/<hr/i);
    });
});

// ---------------------------------------------------------------------------
// 4. Enter-key fallback — SubmitKeymap converts '---' paragraph on Enter
//    Covers the case where the character-level input rule silently misfires
//    (macOS IME, composing events, fast-type race) so the user always gets
//    an HR when they press Enter on a line containing only '---'.
// ---------------------------------------------------------------------------

describe('SubmitKeymap Enter-key fallback: --- paragraph → HR', () => {
    it('pressing Enter in a "---" paragraph triggers HR conversion (focus mode)', () => {
        const submitHandlerRef: { current: SubmitKeymapHandler | null } = {
            current: {
                onEnter: () => false,   // focus mode — Enter not consumed
                onEscape: () => true,
            },
        };

        const { result } = renderHook(() =>
            useEditor({
                extensions: [
                    StarterKit,
                    SubmitKeymap.configure({ handlerRef: submitHandlerRef }),
                ],
                content: '<p>---</p>',
                editable: true,
            }),
        );
        const editor = result.current!;
        act(() => { editor.commands.focus('end'); });

        act(() => { editor.commands.keyboardShortcut('Enter'); });

        expect(editor.getHTML()).toMatch(/<hr/i);
        expect(editor.getHTML()).not.toContain('---');
    });

    it('Enter in "---" paragraph takes priority over onEnter handler', () => {
        const onEnterCalled: boolean[] = [];
        const submitHandlerRef: { current: SubmitKeymapHandler | null } = {
            current: {
                onEnter: () => { onEnterCalled.push(true); return true; },
                onEscape: () => true,
            },
        };

        const { result } = renderHook(() =>
            useEditor({
                extensions: [
                    StarterKit,
                    SubmitKeymap.configure({ handlerRef: submitHandlerRef }),
                ],
                content: '<p>---</p>',
                editable: true,
            }),
        );
        const editor = result.current!;
        act(() => { editor.commands.focus('end'); });

        act(() => { editor.commands.keyboardShortcut('Enter'); });

        // HR conversion fires — onEnter callback bypassed
        expect(editor.getHTML()).toMatch(/<hr/i);
        expect(onEnterCalled).toHaveLength(0);
    });

    it('Enter in a normal paragraph does NOT convert to HR', () => {
        const submitHandlerRef: { current: SubmitKeymapHandler | null } = {
            current: { onEnter: () => false, onEscape: () => true },
        };

        const { result } = renderHook(() =>
            useEditor({
                extensions: [
                    StarterKit,
                    SubmitKeymap.configure({ handlerRef: submitHandlerRef }),
                ],
                content: '<p>Some text</p>',
                editable: true,
            }),
        );
        const editor = result.current!;
        act(() => { editor.commands.focus('end'); });
        act(() => { editor.commands.keyboardShortcut('Enter'); });

        expect(editor.getHTML()).not.toMatch(/<hr/i);
    });
});
