/**
 * useProximityBar — Ref-based proximity detection for NodeUtilsBar.
 * Sets data attributes on the DOM (zero React state, zero re-renders).
 * Pure math helpers live in proximityHelpers.ts (SRP).
 */
import { useEffect, type RefObject } from 'react';
import { recalculatePlacement, checkProximity } from './proximityHelpers';

export { PROXIMITY_THRESHOLD_PX, FLIP_THRESHOLD_PX } from './proximityHelpers';

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
            const nodeWrapper = card.closest<HTMLElement>('.react-flow__node');
            if (nodeWrapper) nodeWrapper.style.zIndex = '';
        };

        const onResize = (): void => { recalculatePlacement(card); };

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
