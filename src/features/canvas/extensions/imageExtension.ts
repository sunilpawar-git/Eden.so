/**
 * TipTap Image Extension — Block-level images with base64 support and resize
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

/** Minimum image width to prevent accidental shrink-to-invisible */
const MIN_IMAGE_WIDTH = 50;
const MIN_IMAGE_HEIGHT = 50;

export const NodeImage = Image.configure({
    inline: false,
    allowBase64: true,
    resize: {
        enabled: true,
        directions: ['right', 'bottom'],
        minWidth: MIN_IMAGE_WIDTH,
        minHeight: MIN_IMAGE_HEIGHT,
        alwaysPreserveAspectRatio: true,
    },
    HTMLAttributes: {
        class: 'node-image',
        loading: 'lazy',
    },
});
