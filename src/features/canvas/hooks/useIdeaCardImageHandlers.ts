import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { useCanvasStore } from '../stores/canvasStore';
import { ensureEditorFocus } from '../services/imageInsertService';
import { useImageInsert } from './useImageInsert';

interface Params {
    id: string;
    editor: Editor | null;
    getMarkdown: () => string;
    imageUploadFn: (file: File) => Promise<string>;
}

export function useIdeaCardImageHandlers({ id, editor, getMarkdown, imageUploadFn }: Params) {
    const handleAfterImageInsert = useCallback(() => {
        const md = getMarkdown();
        if (md) useCanvasStore.getState().updateNodeOutput(id, md);
    }, [id, getMarkdown]);
    const { triggerFilePicker } = useImageInsert(editor, imageUploadFn, handleAfterImageInsert);
    const slashHandler = useCallback((c: string) => {
        if (c === 'ai-generate') useCanvasStore.getState().setInputMode('ai');
        if (c === 'insert-image') triggerFilePicker();
    }, [triggerFilePicker]);
    const handleImageClick = useCallback(() => {
        const store = useCanvasStore.getState();
        if (store.editingNodeId !== id) store.startEditing(id);
        ensureEditorFocus(editor);
        triggerFilePicker();
    }, [id, editor, triggerFilePicker]);
    return { slashHandler, handleImageClick };
}
