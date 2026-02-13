/** useHeadingEditor - Heading editor with slash command + submit keymap support */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { useEditor } from '@tiptap/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useTipTapEditor } from './useTipTapEditor';
import { SlashCommandSuggestion, createSlashSuggestionRender } from '../extensions/slashCommandSuggestion';
import { SubmitKeymap, type SubmitKeymapHandler } from '../extensions/submitKeymap';

export interface UseHeadingEditorOptions {
    heading: string; placeholder: string; isEditing: boolean;
    onHeadingChange: (h: string) => void; onBlur?: (h: string) => void;
    onEnterKey?: () => void; onSlashCommand?: (id: string) => void;
    onSubmitAI?: (prompt: string) => void;
}

export function useHeadingEditor(opts: UseHeadingEditorOptions): {
    editor: ReturnType<typeof useEditor>; suggestionActiveRef: React.RefObject<boolean>;
} {
    const { heading, placeholder, isEditing, onHeadingChange, onBlur, onEnterKey, onSlashCommand, onSubmitAI } = opts;
    const suggestionActiveRef = useRef(false);
    const slashJustSelectedRef = useRef(false);
    const submitHandlerRef = useRef<SubmitKeymapHandler | null>(null);
    const blurRef = useRef<(md: string) => void>(() => undefined);
    const extensions = useMemo(() => [
        SubmitKeymap.configure({ handlerRef: submitHandlerRef }),
        SlashCommandSuggestion.configure({ suggestion: { render: createSlashSuggestionRender({
            onSelect: (id) => { onSlashCommand?.(id); },
            onActiveChange: (active) => {
                suggestionActiveRef.current = active;
                if (!active) slashJustSelectedRef.current = true;
            },
        }) } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);

    const { editor, getMarkdown } = useTipTapEditor({
        initialContent: heading, placeholder, editable: isEditing,
        onBlur: useCallback((md: string) => blurRef.current(md), []),
        onUpdate: onHeadingChange, extraExtensions: extensions,
    });

    useEffect(() => {
        submitHandlerRef.current = {
            onEnter: () => {
                if (suggestionActiveRef.current) return false;
                const mode = useCanvasStore.getState().inputMode;
                if (mode === 'ai') onSubmitAI?.(getMarkdown().trim());
                else onEnterKey?.();
                return true;
            },
            onEscape: () => { onEnterKey?.(); return true; },
        };
        return () => { submitHandlerRef.current = null; };
    }, [getMarkdown, onEnterKey, onSubmitAI]);

    const handleBlur = useCallback((md: string) => {
        if (suggestionActiveRef.current) return;
        if (slashJustSelectedRef.current) {
            slashJustSelectedRef.current = false;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-type-assertion
            queueMicrotask(() => { editor!.commands.focus(); }); return;
        }
        onBlur?.(md);
    }, [onBlur, editor]);
    useEffect(() => { blurRef.current = handleBlur; }, [handleBlur]);

    // Trigger placeholder re-render when text changes (e.g. switching to AI mode)
    const prevPH = useRef(placeholder);
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!editor || placeholder === prevPH.current) return;
        prevPH.current = placeholder;
        editor.view.dispatch(editor.state.tr.setMeta('placeholderUpdate', true));
    }, [editor, placeholder]);

    return { editor, suggestionActiveRef };
}
