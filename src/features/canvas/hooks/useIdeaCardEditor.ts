/**
 * useIdeaCardEditor - Body editor lifecycle, blur guard, content sync for IdeaCard.
 * Slash commands and AI prompt input live in the heading editor only.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { useEditor } from '@tiptap/react';
import type { Extension } from '@tiptap/core';
import { useCanvasStore } from '../stores/canvasStore';
import { useTipTapEditor } from './useTipTapEditor';
import { SubmitKeymap, type SubmitKeymapHandler } from '../extensions/submitKeymap';
import { createFileHandlerExtension } from '../extensions/fileHandlerExtension';
import type { ImageUploadFn } from '../services/imageInsertService';

interface UseIdeaCardEditorOptions {
    isEditing: boolean;
    output: string | undefined;
    getEditableContent: () => string;
    placeholder: string;
    saveContent: (markdown: string) => void;
    onExitEditing: () => void;
    imageUploadFn?: ImageUploadFn;
}

interface UseIdeaCardEditorReturn {
    editor: ReturnType<typeof useEditor>;
    getMarkdown: () => string;
    setContent: (markdown: string) => void;
    /** Ref for Enter/Escape key handlers — populated by useNodeInput or useFocusOverlayActions */
    submitHandlerRef: React.MutableRefObject<SubmitKeymapHandler | null>;
}

export function useIdeaCardEditor(options: UseIdeaCardEditorOptions): UseIdeaCardEditorReturn {
    const {
        isEditing, output, getEditableContent, placeholder,
        saveContent, onExitEditing, imageUploadFn,
    } = options;
    const submitHandlerRef = useRef<SubmitKeymapHandler | null>(null);

    const editorExtensions: Extension[] = useMemo(() => {
        const exts: Extension[] = [SubmitKeymap.configure({ handlerRef: submitHandlerRef }) as Extension];
        if (imageUploadFn) exts.push(createFileHandlerExtension(imageUploadFn) as Extension);
        return exts;
    }, [imageUploadFn]);

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
        saveContent(markdown);
        onExitEditing();
        setContent(markdown);
    }, [saveContent, onExitEditing, setContent]);

    useEffect(() => { blurRef.current = handleBlur; }, [handleBlur]);

    const prevOutputRef = useRef(output);
    useEffect(() => {
        if (output !== prevOutputRef.current && !isEditing) {
            setContent(output ?? '');
            prevOutputRef.current = output;
        }
    }, [output, isEditing, setContent]);

    return { editor, getMarkdown, setContent, submitHandlerRef };
}
