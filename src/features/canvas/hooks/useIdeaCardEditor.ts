/** useIdeaCardEditor - Editor lifecycle, blur guard, content sync for IdeaCard */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { useEditor } from '@tiptap/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useTipTapEditor } from './useTipTapEditor';
import {
    SlashCommandSuggestion, createSlashSuggestionRender,
} from '../extensions/slashCommandSuggestion';

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
}

export function useIdeaCardEditor(options: UseIdeaCardEditorOptions): UseIdeaCardEditorReturn {
    const {
        isEditing, output, getEditableContent, placeholder,
        saveContent, onExitEditing, onSlashCommand,
    } = options;
    const suggestionActiveRef = useRef(false);

    const slashExtensions = useMemo(() => [
        SlashCommandSuggestion.configure({
            suggestion: {
                render: createSlashSuggestionRender({
                    onSelect: onSlashCommand,
                    onActiveChange: (active) => { suggestionActiveRef.current = active; },
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
        extraExtensions: slashExtensions,
    });

    const handleBlur = useCallback((markdown: string) => {
        if (suggestionActiveRef.current) return;
        saveContent(markdown);
        onExitEditing();
        setContent(output ?? '');
    }, [saveContent, onExitEditing, setContent, output]);

    useEffect(() => { blurRef.current = handleBlur; }, [handleBlur]);

    const prevOutputRef = useRef(output);
    useEffect(() => {
        if (output !== prevOutputRef.current && !isEditing) {
            setContent(output ?? '');
            prevOutputRef.current = output;
        }
    }, [output, isEditing, setContent]);

    return { editor, getMarkdown, setContent, suggestionActiveRef };
}
