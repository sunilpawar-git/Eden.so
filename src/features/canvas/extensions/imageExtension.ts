/**
 * TipTap Image Extension — Configured for block-level images with base64 support
 * Resize is disabled here; enabled in Phase 5 with custom NodeView
 */
import Image from '@tiptap/extension-image';

/** Check whether an image src uses a safe protocol */
export function isSafeImageSrc(src: string): boolean {
    if (!src) return false;
    if (src.startsWith('data:image/')) return true;
    try {
        const url = new URL(src);
        return url.protocol === 'https:';
    } catch {
        return false;
    }
}

export const NodeImage = Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
        class: 'node-image',
        loading: 'lazy',
    },
});
