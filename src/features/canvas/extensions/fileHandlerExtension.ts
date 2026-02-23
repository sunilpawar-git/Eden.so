/**
 * TipTap FileHandler Extension — Handles drag-drop and paste of image files
 * Delegates insertion to imageInsertService (SSOT for progressive upload)
 */
import { FileHandler } from '@tiptap/extension-file-handler';
import { IMAGE_ACCEPTED_MIME_TYPES } from '../types/image';
import { insertImageIntoEditor, type ImageUploadFn } from '../services/imageInsertService';

/** Convert MIME type array to string array for FileHandler config */
const ALLOWED_MIME_TYPES = [...IMAGE_ACCEPTED_MIME_TYPES] as string[];

/**
 * Create a configured FileHandler extension bound to an upload function.
 * Must be called per-editor instance since uploadFn captures node context.
 */
export function createFileHandlerExtension(uploadFn: ImageUploadFn) {
    return FileHandler.configure({
        allowedMimeTypes: ALLOWED_MIME_TYPES,
        onDrop: (currentEditor, files, pos) => {
            const imageFile = files.find(f => ALLOWED_MIME_TYPES.includes(f.type));
            if (!imageFile) return;
            currentEditor.commands.focus(pos);
            void insertImageIntoEditor(currentEditor, imageFile, uploadFn);
        },
        onPaste: (currentEditor, files) => {
            const imageFile = files.find(f => ALLOWED_MIME_TYPES.includes(f.type));
            if (!imageFile) return;
            void insertImageIntoEditor(currentEditor, imageFile, uploadFn);
        },
    });
}
