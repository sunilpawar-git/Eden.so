/**
 * useImageInsert — React hook providing file picker trigger for image insertion
 * Delegates to imageInsertService for actual insertion logic (SRP)
 */
import { useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { IMAGE_ACCEPTED_MIME_TYPES } from '../types/image';
import {
    ensureEditorFocus,
    insertImageIntoEditor,
    type ImageUploadFn,
} from '../services/imageInsertService';

/** Accept attribute for file picker input (derived from SSOT constants) */
const FILE_ACCEPT = IMAGE_ACCEPTED_MIME_TYPES.join(',');

/**
 * Hook providing file picker trigger and image insertion for canvas nodes.
 * The returned `triggerFilePicker` opens the native file dialog,
 * then inserts the selected image via progressive upload.
 */
export function useImageInsert(editor: Editor | null, uploadFn: ImageUploadFn, onAfterInsert?: () => void) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const triggerFilePicker = useCallback(() => {
        ensureEditorFocus(editor);
        let input = inputRef.current;
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.accept = FILE_ACCEPT;
            input.style.display = 'none';
            inputRef.current = input;
        }
        input.value = '';
        input.onchange = () => {
            const file = input.files?.[0];
            if (file) void insertImageIntoEditor(editor, file, uploadFn, onAfterInsert);
        };
        input.click();
    }, [editor, uploadFn, onAfterInsert]);

    return { triggerFilePicker };
}
