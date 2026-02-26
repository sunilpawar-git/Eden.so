/**
 * useProximityBar — Ref-based proximity detection for NodeUtilsBar.
 * Sets data attributes directly on the DOM (zero React state, zero re-renders).
 *
 * Data attributes set on cardRef element:
 * - data-hovered="true"|removed         (mouse anywhere on card)
 * - data-bar-proximity="near"|removed   (mouse within threshold of bar edge)
 * - data-bar-placement="left"|"right"   (auto-flips near viewport edge)
 * - data-bar-focused="true"|removed     (keyboard focus inside bar, a11y)
 */
import { useEffect, type RefObject } from 'react';

export const PROXIMITY_THRESHOLD_PX = 80;
export const FLIP_THRESHOLD_PX = 60;

function recalculatePlacement(card: HTMLElement): void {
    const rect = card.getBoundingClientRect();
    const distFromViewportRight = window.innerWidth - rect.right;
    const placement = distFromViewportRight < FLIP_THRESHOLD_PX ? 'left' : 'right';
    card.setAttribute('data-bar-placement', placement);
}

function checkProximity(card: HTMLElement, clientX: number): void {
    const rect = card.getBoundingClientRect();
    const placement = card.getAttribute('data-bar-placement') ?? 'right';
    const distanceFromEdge = placement === 'left'
        ? clientX - rect.left
        : rect.right - clientX;

    if (distanceFromEdge <= PROXIMITY_THRESHOLD_PX) {
        card.setAttribute('data-bar-proximity', 'near');
    } else {
        card.removeAttribute('data-bar-proximity');
    }
}

export function useProximityBar(
    cardRef: RefObject<HTMLElement | null>,
    barRef: RefObject<HTMLElement | null>,
): void {
    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        card.setAttribute('data-bar-placement', 'right');

        const onMouseEnter = (): void => {
            card.setAttribute('data-hovered', 'true');
            recalculatePlacement(card);
        };

        const onMouseMove = (e: MouseEvent): void => {
            checkProximity(card, e.clientX);
        };

        const onMouseLeave = (): void => {
            card.removeAttribute('data-hovered');
            card.removeAttribute('data-bar-proximity');
        };

        const onResize = (): void => {
            recalculatePlacement(card);
        };

        const onFocusIn = (e: FocusEvent): void => {
            const bar = barRef.current;
            if (bar && e.target instanceof Node && bar.contains(e.target)) {
                card.setAttribute('data-bar-focused', 'true');
            }
        };

        const onFocusOut = (e: FocusEvent): void => {
            const bar = barRef.current;
            if (!bar) return;
            const related = e.relatedTarget instanceof Node ? e.relatedTarget : null;
            if (!related || !bar.contains(related)) {
                card.removeAttribute('data-bar-focused');
            }
        };

        card.addEventListener('mouseenter', onMouseEnter);
        card.addEventListener('mousemove', onMouseMove);
        card.addEventListener('mouseleave', onMouseLeave);
        card.addEventListener('focusin', onFocusIn);
        card.addEventListener('focusout', onFocusOut);
        window.addEventListener('resize', onResize, { passive: true });

        return () => {
            card.removeEventListener('mouseenter', onMouseEnter);
            card.removeEventListener('mousemove', onMouseMove);
            card.removeEventListener('mouseleave', onMouseLeave);
            card.removeEventListener('focusin', onFocusIn);
            card.removeEventListener('focusout', onFocusOut);
            window.removeEventListener('resize', onResize);
        };
    }, [cardRef, barRef]);
}
