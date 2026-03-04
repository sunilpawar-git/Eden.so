import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { useCanvasStore } from '../stores/canvasStore';
import { ensureEditorFocus } from '../services/imageInsertService';
import { useImageInsert } from './useImageInsert';
import { useDocumentInsert } from './useDocumentInsert';
import { useNodeDocumentUpload } from './useNodeDocumentUpload';
import type { DocumentInsertFn } from '../extensions/fileHandlerExtension';

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

    const { triggerFilePicker: triggerImagePicker } = useImageInsert(editor, imageUploadFn, handleAfterImageInsert);
    const documentUploadFn = useNodeDocumentUpload(id);
    const { triggerFilePicker: triggerDocumentPicker, insertFileDirectly } = useDocumentInsert(id, editor, documentUploadFn, getMarkdown);

    /**
     * Adapter that matches DocumentInsertFn signature (editor, file) → (file).
     * The editor arg is ignored because insertFileDirectly already closes over
     * the editor from useDocumentInsert.
     */
    const documentInsertFn: DocumentInsertFn = useCallback(
        (_editor: Editor, file: File) => insertFileDirectly(file),
        [insertFileDirectly],
    );

    const slashHandler = useCallback((c: string) => {
        if (c === 'ai-generate') useCanvasStore.getState().setInputMode('ai');
        if (c === 'insert-image') triggerImagePicker();
        if (c === 'insert-document') triggerDocumentPicker();
    }, [triggerImagePicker, triggerDocumentPicker]);

    const handleImageClick = useCallback(() => {
        const store = useCanvasStore.getState();
        if (store.editingNodeId !== id) store.startEditing(id);
        ensureEditorFocus(editor);
        triggerImagePicker();
    }, [id, editor, triggerImagePicker]);

    const handleAttachmentClick = useCallback(() => {
        const store = useCanvasStore.getState();
        if (store.editingNodeId !== id) store.startEditing(id);
        ensureEditorFocus(editor);
        triggerDocumentPicker();
    }, [id, editor, triggerDocumentPicker]);

    return { slashHandler, handleImageClick, handleAttachmentClick, documentInsertFn };
}
