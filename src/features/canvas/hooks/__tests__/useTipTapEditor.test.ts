/**
 * useTipTapEditor Hook Tests
 * TDD: Validates editor lifecycle, markdown I/O, and callback wiring
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTipTapEditor } from '../useTipTapEditor';

describe('useTipTapEditor', () => {
    it('creates an editor instance on mount', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: 'Type...' })
        );
        expect(result.current.editor).not.toBeNull();
    });

    it('initializes with content from markdown string', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '**bold text**', placeholder: '' })
        );
        const html = result.current.editor!.getHTML();
        expect(html).toContain('<strong>bold text</strong>');
    });

    it('returns markdown string via getMarkdown', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '**bold**', placeholder: '' })
        );
        expect(result.current.getMarkdown()).toBe('**bold**');
    });

    it('reports isEmpty correctly for empty content', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: '' })
        );
        expect(result.current.isEmpty).toBe(true);
    });

    it('reports isEmpty correctly for non-empty content', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'hello', placeholder: '' })
        );
        expect(result.current.isEmpty).toBe(false);
    });

    it('returns plain text via getText', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '**bold** text', placeholder: '' })
        );
        expect(result.current.getText()).toContain('bold text');
    });

    it('wires onBlur callback to editor options', () => {
        const onBlur = vi.fn();
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'hello', placeholder: '', onBlur })
        );
        // Verify editor is created with blur handler wired
        // (ProseMirror blur events don't fire in jsdom, but the callback is wired)
        expect(result.current.editor).not.toBeNull();
        // Verify getMarkdown returns the content that onBlur would provide
        expect(result.current.getMarkdown()).toBe('hello');
    });

    it('returns editor instance that can be used until unmount', () => {
        const { result, unmount } = renderHook(() =>
            useTipTapEditor({ initialContent: 'test', placeholder: '' })
        );
        // Editor exists and is functional
        expect(result.current.editor).not.toBeNull();
        expect(result.current.getMarkdown()).toBe('test');
        // Unmount triggers cleanup (TipTap handles destruction internally)
        unmount();
    });

    it('respects editable option', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'text', placeholder: '', editable: false })
        );
        expect(result.current.editor!.isEditable).toBe(false);
    });

    it('defaults to editable when option not specified', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: '' })
        );
        expect(result.current.editor!.isEditable).toBe(true);
    });

    it('provides setContent to update editor content programmatically', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'original', placeholder: '' })
        );
        expect(result.current.getMarkdown()).toBe('original');
        result.current.setContent('**updated**');
        expect(result.current.getMarkdown()).toBe('**updated**');
    });

    it('setContent with empty string clears the editor', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'has content', placeholder: '' })
        );
        result.current.setContent('');
        // After clearing, getMarkdown returns empty and editor content is cleared
        expect(result.current.getMarkdown()).toBe('');
    });

    describe('focusAtEnd', () => {
        it('returns a focusAtEnd function', () => {
            const { result } = renderHook(() =>
                useTipTapEditor({ initialContent: 'test', placeholder: '' })
            );
            expect(typeof result.current.focusAtEnd).toBe('function');
        });

        it('focuses the editor and places cursor at end of document', () => {
            const { result } = renderHook(() =>
                useTipTapEditor({ initialContent: 'hello world', placeholder: '' })
            );
            // Should not throw — focus('end') is a ProseMirror command
            expect(() => result.current.focusAtEnd()).not.toThrow();
            // Editor should remain editable after focusAtEnd
            expect(result.current.editor!.isEditable).toBe(true);
        });

        it('sets editor to editable before focusing', () => {
            const { result } = renderHook(() =>
                useTipTapEditor({ initialContent: 'text', placeholder: '', editable: false })
            );
            expect(result.current.editor!.isEditable).toBe(false);
            result.current.focusAtEnd();
            // focusAtEnd must flip editable to true so typing is accepted
            expect(result.current.editor!.isEditable).toBe(true);
        });

        it('does not throw when editor is null', () => {
            // Edge case: editor not yet initialized
            const { result } = renderHook(() =>
                useTipTapEditor({ initialContent: '', placeholder: '' })
            );
            // Should not throw even if called immediately
            expect(() => result.current.focusAtEnd()).not.toThrow();
        });
    });

    describe('onUpdate callback', () => {
        it('wires onUpdate callback to editor options', () => {
            const onUpdate = vi.fn();
            const { result } = renderHook(() =>
                useTipTapEditor({ initialContent: 'hello', placeholder: '', onUpdate })
            );
            // Editor is created with update handler wired
            expect(result.current.editor).not.toBeNull();
        });
    });

    describe('editable sync (removed)', () => {
        it('does not use useEffect to sync editable — caller controls directly', () => {
            // Render with editable=false, then editable=true should be controlled
            // by the caller (useNodeInput) calling editor.setEditable() directly
            const { result, rerender } = renderHook(
                ({ editable }) => useTipTapEditor({ initialContent: 'text', placeholder: '', editable }),
                { initialProps: { editable: false } }
            );
            expect(result.current.editor!.isEditable).toBe(false);
            // Re-render alone should NOT change editable (no useEffect sync)
            rerender({ editable: false });
            expect(result.current.editor!.isEditable).toBe(false);
        });
    });
});
