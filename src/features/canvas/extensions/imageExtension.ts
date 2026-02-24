/**
 * TipTap Image Extension — Block-level images with base64 support and resize.
 * Extends the default Image to constrain resize-wrapper DOM so images
 * never overflow their parent node regardless of intrinsic resolution.
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

const MIN_IMAGE_WIDTH = 50;
const MIN_IMAGE_HEIGHT = 50;

/**
 * Apply responsive constraints to the ResizableNodeView DOM so images
 * scale to fit their container instead of overflowing.
 *
 * The container is `display:flex` and the wrapper is a flex item whose
 * automatic min-width equals the image's intrinsic width (e.g. 1920px).
 * `overflow: hidden` on a flex item resets its automatic minimum to 0,
 * and `max-width: 100%` caps it to the editor's width.
 */
export function applyResponsiveConstraints(dom: HTMLElement): void {
    dom.style.overflow = 'hidden';

    const wrapper = dom.firstElementChild as HTMLElement | null;
    if (!wrapper) return;

    wrapper.style.maxWidth = '100%';
    wrapper.style.minWidth = '0';
    wrapper.style.overflow = 'hidden';

    const img = wrapper.querySelector('img') as HTMLImageElement | null;
    if (img) {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
    }
}

export const NodeImage = Image.extend({
    addNodeView() {
        const parentFactory = this.parent?.();
        if (!parentFactory) return null;

        return (props: Parameters<typeof parentFactory>[0]) => {
            const nodeView = parentFactory(props);
            if (nodeView && 'dom' in nodeView) {
                applyResponsiveConstraints(nodeView.dom as HTMLElement);
            }
            return nodeView;
        };
    },
}).configure({
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
