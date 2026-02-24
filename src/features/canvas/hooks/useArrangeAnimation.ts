/**
 * useArrangeAnimation Hook - Adds CSS transition to node rearrangement
 * Sets a data attribute on the container to enable transition, then removes it
 */
import { useCallback, useRef, type RefObject } from 'react';

/** Must exceed the CSS transition duration (0.4s) in CanvasView.module.css to ensure cleanup happens after animation completes */
const ANIMATION_CLEANUP_DELAY_MS = 500;

/** Stable canvas container selector using data attribute (not dependent on CSS module class names) */
const CANVAS_CONTAINER_SELECTOR = '[data-canvas-container]';

/**
 * Wraps an arrange function with a CSS transition animation.
 * Adds `data-arranging="true"` to the container element during the transition.
 * Accepts an optional ref; falls back to DOM query for the canvas container.
 */
export function useArrangeAnimation(
    containerRef: RefObject<HTMLElement | null> | null,
    arrangeNodes: () => void
) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const animatedArrange = useCallback(() => {
        const container = containerRef?.current
            ?? document.querySelector<HTMLElement>(CANVAS_CONTAINER_SELECTOR);

        if (container) {
            container.setAttribute('data-arranging', 'true');
        }

        arrangeNodes();

        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            if (container) {
                container.removeAttribute('data-arranging');
            }
            timeoutRef.current = null;
        }, ANIMATION_CLEANUP_DELAY_MS);
    }, [containerRef, arrangeNodes]);

    return { animatedArrange };
}
