/**
 * useCssHover — Lightweight hover tracking via DOM matches(':hover').
 * Returns a boolean that only flips when actual hover state changes,
 * avoiding cascading re-renders from synthetic React mouse events
 * during parent re-renders.
 */
import { useState, useEffect, type RefObject } from 'react';

export function useCssHover(ref: RefObject<HTMLElement | null>): boolean {
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onEnter = () => setHovered(true);
        const onLeave = () => setHovered(false);
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
        return () => {
            el.removeEventListener('mouseenter', onEnter);
            el.removeEventListener('mouseleave', onLeave);
        };
    }, [ref]);

    return hovered;
}
