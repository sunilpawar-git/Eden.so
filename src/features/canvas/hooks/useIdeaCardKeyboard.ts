/** useIdeaCardKeyboard - Keyboard & click interaction for IdeaCard */
import { useCallback, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { InputMode } from '../types/slashCommand';

interface UseIdeaCardKeyboardOptions {
    editor: Editor | null;
    isEditing: boolean;
    isGenerating: boolean;
    inputMode: InputMode;
    getMarkdown: () => string;
    setContent: (markdown: string) => void;
    getEditableContent: () => string;
    suggestionActiveRef: React.RefObject<boolean>;
    saveContent: (markdown: string) => void;
    onExitEditing: () => void;
    onEnterEditing: () => void;
    onSubmitNote: (trimmed: string) => void;
    onSubmitAI: (trimmed: string) => void;
}

export function useIdeaCardKeyboard(options: UseIdeaCardKeyboardOptions) {
    const {
        editor, isEditing, isGenerating, inputMode, getMarkdown,
        setContent, getEditableContent, suggestionActiveRef,
        saveContent, onExitEditing, onEnterEditing, onSubmitNote, onSubmitAI,
    } = options;

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!editor || !isEditing) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                saveContent(getMarkdown());
                onExitEditing();
            }
            if (event.key === 'Enter' && !event.shiftKey && !suggestionActiveRef.current) {
                event.preventDefault();
                event.stopPropagation();
                const trimmed = getMarkdown().trim();
                if (!trimmed) { onExitEditing(); return; }
                if (inputMode === 'ai') onSubmitAI(trimmed); else onSubmitNote(trimmed);
            }
        };
        editor.view.dom.addEventListener('keydown', handleKeyDown);
        return () => editor.view.dom.removeEventListener('keydown', handleKeyDown);
    }, [editor, isEditing, inputMode, getMarkdown, saveContent,
        onExitEditing, onSubmitNote, onSubmitAI, suggestionActiveRef]);

    const enterEdit = useCallback(() => {
        setContent(getEditableContent());
        onEnterEditing();
    }, [setContent, getEditableContent, onEnterEditing]);

    const handleContentDoubleClick = useCallback(() => {
        if (!isGenerating) enterEdit();
    }, [isGenerating, enterEdit]);

    const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (isGenerating) return;
        if (e.key === 'Enter') { e.preventDefault(); enterEdit(); return; }
        const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isPrintable) {
            enterEdit();
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (editor) editor.commands.insertContent(e.key);
        }
    }, [isGenerating, enterEdit, editor]);

    return { handleContentDoubleClick, handleContentKeyDown };
}
