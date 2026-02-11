/**
 * useTipTapEditor Hook - Encapsulates TipTap editor setup with markdown I/O
 * Bridges TipTap's document model with the store's string-based contract
 */
import { useCallback, useEffect, useRef } from 'react';
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
}

/** Hook for managing a TipTap editor with markdown serialization */
export function useTipTapEditor(options: UseTipTapEditorOptions): UseTipTapEditorReturn {
    const { initialContent, placeholder, editable = true, onBlur, onUpdate, extraExtensions = [] } = options;

    // Guard: skip onUpdate during programmatic setContent to avoid writing stale content back
    const skipNextUpdateRef = useRef(false);

    // Keep the placeholder in a ref so the Placeholder extension's decoration
    // function always reads the latest value (TipTap only captures options at
    // creation time, but supports a function callback that is invoked on each
    // decoration pass).
    const placeholderRef = useRef(placeholder);
    placeholderRef.current = placeholder;

    const editor = useEditor({
        extensions: [StarterKit, Placeholder.configure({ placeholder: () => placeholderRef.current }), ...extraExtensions],
        content: initialContent ? markdownToHtml(initialContent) : '',
        editable,
        onBlur: ({ editor: e }) => { onBlur?.(htmlToMarkdown(e.getHTML())); },
        onUpdate: ({ editor: e }) => {
            if (skipNextUpdateRef.current) { skipNextUpdateRef.current = false; return; }
            onUpdate?.(htmlToMarkdown(e.getHTML()));
        },
    });

    // Sync editable state reactively — TipTap's useEditor does not update
    // editability after creation, so we must call setEditable explicitly.
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (editor && !editor.isDestroyed && editor.isEditable !== editable) {
            editor.setEditable(editable);
        }
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
        skipNextUpdateRef.current = true;
        if (markdown) { editor.commands.setContent(markdownToHtml(markdown)); }
        else { editor.commands.clearContent(); }
    }, [editor]);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return { editor, getMarkdown, getText, setContent, isEmpty: editor ? editor.isEmpty : true };
}
