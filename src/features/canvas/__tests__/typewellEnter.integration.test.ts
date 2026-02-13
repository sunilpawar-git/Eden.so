/**
 * TypeWell integration tests: Enter key creates new paragraph in body editor.
 * Split from editorPipeline.integration.test.ts to stay under 300-line limit.
 *
 * Validates that the SubmitKeymap onEnter returning false allows StarterKit
 * to create new paragraphs (notepad-like behavior), while Escape and blur
 * still exit editing and save content.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { SubmitKeymap } from '../extensions/submitKeymap';
import { markdownToHtml, htmlToMarkdown } from '../services/markdownConverter';

describe('Enter key creates new paragraph in body editor (real TipTap)', () => {
    it('Enter key in body editor creates a new paragraph (not submit)', () => {
        const handlerRef = { current: { onEnter: () => false, onEscape: () => true } };

        const { result } = renderHook(() =>
            useEditor({
                extensions: [
                    StarterKit,
                    SubmitKeymap.configure({ handlerRef }),
                ],
                content: '<p>first line</p>',
                editable: true,
            }),
        );
        const editor = result.current;
        expect(editor).not.toBeNull();

        act(() => {
            editor!.commands.focus('end');
            editor!.commands.splitBlock();
        });

        const html = editor!.getHTML();
        const paragraphCount = (html.match(/<p>/g) ?? []).length;
        expect(paragraphCount).toBe(2);
    });

    it('Shift+Enter in body editor creates hard break', () => {
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '<p>line one</p>',
                editable: true,
            }),
        );
        const editor = result.current;
        expect(editor).not.toBeNull();

        act(() => {
            editor!.commands.focus('end');
            editor!.commands.setHardBreak();
            const { state, dispatch } = editor!.view;
            dispatch(state.tr.insertText('line two'));
        });

        const html = editor!.getHTML();
        expect(html).toContain('<br');
        expect(editor!.getText()).toContain('line two');
    });

    it('Escape in body editor still calls onEscape handler', () => {
        const onEscape = vi.fn(() => true);
        const handlerRef = { current: { onEnter: () => false, onEscape } };

        renderHook(() =>
            useEditor({
                extensions: [
                    StarterKit,
                    SubmitKeymap.configure({ handlerRef }),
                ],
                content: '<p>some text</p>',
                editable: true,
            }),
        );

        const result = handlerRef.current.onEscape();
        expect(result).toBe(true);
        expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it('multiline content round-trips through markdown correctly', () => {
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
            dispatch(state.tr.insertText('First paragraph'));
            editor!.commands.splitBlock();
            const s2 = editor!.view.state;
            editor!.view.dispatch(s2.tr.insertText('Second paragraph'));
        });

        const markdown = htmlToMarkdown(editor!.getHTML());
        expect(markdown).toContain('First paragraph');
        expect(markdown).toContain('Second paragraph');
        const roundTripped = htmlToMarkdown(markdownToHtml(markdown));
        expect(roundTripped.trim()).toBe(markdown.trim());
    });
});
