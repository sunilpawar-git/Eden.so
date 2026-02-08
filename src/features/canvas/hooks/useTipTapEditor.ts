/**
 * useTipTapEditor Hook - Encapsulates TipTap editor setup with markdown I/O
 * Bridges TipTap's document model with the store's string-based contract
 */
import { useCallback, useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Extension } from '@tiptap/core';
import { markdownToHtml, htmlToMarkdown } from '../services/markdownConverter';

interface UseTipTapEditorOptions {
    initialContent: string;
    placeholder: string;
    editable?: boolean;
    onBlur?: (markdown: string) => void;
    onUpdate?: (markdown: string) => void;
    extraExtensions?: Extension[];
}

interface UseTipTapEditorReturn {
    editor: ReturnType<typeof useEditor>;
    getMarkdown: () => string;
    getText: () => string;
    isEmpty: boolean;
    setContent: (markdown: string) => void;
    focusAtEnd: () => void;
}

/** Hook for managing a TipTap editor with markdown serialization */
export function useTipTapEditor(options: UseTipTapEditorOptions): UseTipTapEditorReturn {
    const { initialContent, placeholder, editable = true, onBlur, onUpdate, extraExtensions = [] } = options;

    const editor = useEditor({
        extensions: [StarterKit, Placeholder.configure({ placeholder }), ...extraExtensions],
        content: initialContent ? markdownToHtml(initialContent) : '',
        editable,
        onBlur: ({ editor: e }) => { onBlur?.(htmlToMarkdown(e.getHTML())); },
        onUpdate: ({ editor: e }) => { onUpdate?.(htmlToMarkdown(e.getHTML())); },
    });

    // Sync editable state when prop changes (TipTap doesn't auto-react)
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (editor) editor.setEditable(editable);
    }, [editor, editable]);

    const getMarkdown = useCallback((): string => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return editor ? htmlToMarkdown(editor.getHTML()) : '';
    }, [editor]);

    const getText = useCallback((): string => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return editor ? editor.getText() : '';
    }, [editor]);

    const setContent = useCallback((markdown: string): void => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!editor) return;
        if (markdown) { editor.commands.setContent(markdownToHtml(markdown)); }
        else { editor.commands.clearContent(); }
    }, [editor]);

    const focusAtEnd = useCallback((): void => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!editor) return;
        editor.setEditable(true);
        editor.commands.focus('end');
    }, [editor]);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return { editor, getMarkdown, getText, setContent, focusAtEnd, isEmpty: editor ? editor.isEmpty : true };
}
