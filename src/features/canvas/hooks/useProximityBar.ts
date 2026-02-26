/**
 * useProximityBar — Ref-based proximity detection for NodeUtilsBar.
 * Sets data attributes directly on the DOM (zero React state, zero re-renders).
 *
 * The bar lives OUTSIDE the card edge (position: absolute; left: 100%).
 * Proximity fires when cursor approaches or passes the card edge toward the bar.
 *
 * Data attributes set on cardRef element:
 * - data-hovered="true"|removed         (mouse anywhere on card)
 * - data-bar-proximity="near"|removed   (cursor near or past the bar-side edge)
 * - data-bar-placement="left"|"right"   (auto-flips near viewport edge)
 * - data-bar-focused="true"|removed     (keyboard focus inside bar, a11y)
 * - data-bar-deck="1"|"2"|removed       (which deck level the cursor has reached)
 */
import { useEffect, type RefObject } from 'react';

export const PROXIMITY_THRESHOLD_PX = 80;
export const FLIP_THRESHOLD_PX = 60;
export const DECK_TWO_THRESHOLD_PX = 50;

function recalculatePlacement(card: HTMLElement): void {
    const rect = card.getBoundingClientRect();
    const distFromViewportRight = window.innerWidth - rect.right;
    const placement = distFromViewportRight < FLIP_THRESHOLD_PX ? 'left' : 'right';
    card.setAttribute('data-bar-placement', placement);
}

/**
 * Proximity detection: measures how close the cursor is to the bar-side edge.
 * `distToEdge` is the absolute distance from the cursor to the card edge.
 * `pastEdge` is positive when the cursor has crossed past the edge toward the bar.
 */
function checkProximity(card: HTMLElement, clientX: number): void {
    const rect = card.getBoundingClientRect();
    const placement = card.getAttribute('data-bar-placement') ?? 'right';

    const edgeX = placement === 'left' ? rect.left : rect.right;
    const signedDist = placement === 'left'
        ? edgeX - clientX
        : clientX - edgeX;

    const distToEdge = Math.abs(signedDist);

    if (distToEdge <= PROXIMITY_THRESHOLD_PX) {
        card.setAttribute('data-bar-proximity', 'near');
        const pastEdge = Math.max(0, signedDist);
        card.setAttribute('data-bar-deck', pastEdge >= DECK_TWO_THRESHOLD_PX ? '2' : '1');
    } else {
        card.removeAttribute('data-bar-proximity');
        card.removeAttribute('data-bar-deck');
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
            card.removeAttribute('data-bar-deck');
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
