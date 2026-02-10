/** useIdeaCardEditor - Editor lifecycle, blur guard, content sync for IdeaCard */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { useEditor } from '@tiptap/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useTipTapEditor } from './useTipTapEditor';
import {
    SlashCommandSuggestion, createSlashSuggestionRender,
} from '../extensions/slashCommandSuggestion';
import { SubmitKeymap, type SubmitKeymapHandler } from '../extensions/submitKeymap';

interface UseIdeaCardEditorOptions {
    isEditing: boolean;
    output: string | undefined;
    getEditableContent: () => string;
    placeholder: string;
    saveContent: (markdown: string) => void;
    onExitEditing: () => void;
    onSlashCommand: (commandId: string) => void;
}

interface UseIdeaCardEditorReturn {
    editor: ReturnType<typeof useEditor>;
    getMarkdown: () => string;
    setContent: (markdown: string) => void;
    suggestionActiveRef: React.RefObject<boolean>;
    /** Ref for Enter/Escape key handlers — populated by useNodeInput */
    submitHandlerRef: React.MutableRefObject<SubmitKeymapHandler | null>;
}

export function useIdeaCardEditor(options: UseIdeaCardEditorOptions): UseIdeaCardEditorReturn {
    const {
        isEditing, output, getEditableContent, placeholder,
        saveContent, onExitEditing, onSlashCommand,
    } = options;
    const suggestionActiveRef = useRef(false);
    /** Ref for Enter/Escape handlers — populated by useNodeInput */
    const submitHandlerRef = useRef<SubmitKeymapHandler | null>(null);
    /** Guards against blur firing right after a slash command is selected */
    const slashJustSelectedRef = useRef(false);

    const editorExtensions = useMemo(() => [
        SubmitKeymap.configure({ handlerRef: submitHandlerRef }),
        SlashCommandSuggestion.configure({
            suggestion: {
                render: createSlashSuggestionRender({
                    onSelect: onSlashCommand,
                    onActiveChange: (active) => {
                        suggestionActiveRef.current = active;
                        // When the popup closes after a selection, mark the
                        // guard so the subsequent blur doesn't exit editing.
                        // Note: we cannot check inputMode here because onExit
                        // fires synchronously during deleteRange — BEFORE
                        // onSelect sets inputMode. Guard unconditionally.
                        if (!active) {
                            slashJustSelectedRef.current = true;
                        }
                    },
                }),
            },
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);

    const blurRef = useRef<(md: string) => void>(() => undefined);
    const displayContent = isEditing ? getEditableContent() : (output ?? '');

    const onUpdate = useCallback((markdown: string) => {
        useCanvasStore.getState().updateDraft(markdown);
    }, []);

    const { editor, getMarkdown, setContent } = useTipTapEditor({
        initialContent: displayContent, placeholder, editable: isEditing,
        onBlur: useCallback((md: string) => blurRef.current(md), []),
        onUpdate,
        extraExtensions: editorExtensions,
    });

    const handleBlur = useCallback((markdown: string) => {
        if (suggestionActiveRef.current) return;
        // After a slash command selects AI mode, the popup removal causes a
        // spurious blur. Skip it and re-focus so the user can type a prompt.
        if (slashJustSelectedRef.current) {
            slashJustSelectedRef.current = false;
            // Re-focus the editor so the user stays in edit mode
            queueMicrotask(() => { editor?.commands.focus(); });
            return;
        }
        saveContent(markdown);
        onExitEditing();
        setContent(output ?? '');
    }, [saveContent, onExitEditing, setContent, output, editor]);

    useEffect(() => { blurRef.current = handleBlur; }, [handleBlur]);

    // When the placeholder text changes (e.g. switching to AI mode via slash
    // command), the useTipTapEditor's placeholderRef is already updated. We just
    // need to trigger ProseMirror to re-run the decoration function so it picks
    // up the new value from the ref-backed callback.
    const prevPlaceholderRef = useRef(placeholder);
    useEffect(() => {
        if (!editor || placeholder === prevPlaceholderRef.current) return;
        prevPlaceholderRef.current = placeholder;
        // Dispatch a no-op transaction so ProseMirror recalculates decorations.
        // We mark it addToHistory: false and use setMeta to ensure it's not
        // optimized away.
        editor.view.dispatch(
            editor.state.tr.setMeta('placeholderUpdate', true),
        );
    }, [editor, placeholder]);

    const prevOutputRef = useRef(output);
    useEffect(() => {
        if (output !== prevOutputRef.current && !isEditing) {
            setContent(output ?? '');
            prevOutputRef.current = output;
        }
    }, [output, isEditing, setContent]);

    return { editor, getMarkdown, setContent, suggestionActiveRef, submitHandlerRef };
}
