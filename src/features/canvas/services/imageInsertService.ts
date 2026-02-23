/**
 * Image Insert Service — Progressive image insertion into TipTap editors
 * Pure functions (no React hooks) for focus restoration and image lifecycle
 */
import type { Editor } from '@tiptap/core';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';

export type ImageUploadFn = (file: File) => Promise<string>;

/**
 * Restore focus to the TipTap editor if it is blurred.
 * Places cursor at end so inserted content appends naturally.
 * No-op when the editor already has focus (preserves cursor position).
 */
export function ensureEditorFocus(editor: Editor | null): void {
    if (!editor || editor.isDestroyed) return;
    if (!editor.isFocused) {
        editor.commands.focus('end');
    }
}

/** Read a File as a base64 data URL */
function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(strings.canvas.imageUploadFailed));
        reader.readAsDataURL(file);
    });
}

/**
 * Insert an image into the editor using progressive upload:
 * 1. Insert base64 placeholder immediately
 * 2. Upload to permanent storage
 * 3. Replace base64 src with permanent URL
 */
export async function insertImageIntoEditor(
    editor: Editor | null,
    file: File,
    uploadFn: ImageUploadFn,
): Promise<void> {
    if (!editor || editor.isDestroyed) return;

    ensureEditorFocus(editor);

    const dataUrl = await readAsDataUrl(file);
    editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();

    try {
        const permanentUrl = await uploadFn(file);
        replaceImageSrc(editor, dataUrl, permanentUrl);
    } catch {
        removeImageBySrc(editor, dataUrl);
        toast.error(strings.canvas.imageUploadFailed);
    }
}

/** Replace the src of an image node matching oldSrc with newSrc */
function replaceImageSrc(editor: Editor, oldSrc: string, newSrc: string): void {
    const { doc, tr } = editor.state;
    doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === oldSrc) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: newSrc });
        }
    });
    editor.view.dispatch(tr);
}

/** Remove an image node matching the given src (cleanup on upload failure) */
function removeImageBySrc(editor: Editor, src: string): void {
    const { doc, tr } = editor.state;
    doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === src) {
            tr.delete(pos, pos + node.nodeSize);
        }
    });
    editor.view.dispatch(tr);
}
