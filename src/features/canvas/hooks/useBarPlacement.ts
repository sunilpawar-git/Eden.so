/**
 * useBarPlacement — Determines whether NodeUtilsBar appears on right or left
 * Flips to left when the node is near the right edge of the viewport,
 * preventing the bar from rendering off-screen.
 */
import { useState, useEffect, useCallback, type RefObject } from 'react';

/** Distance (px) from viewport right edge that triggers left-flip */
const FLIP_THRESHOLD_PX = 60;

export type BarPlacement = 'right' | 'left';

export function useBarPlacement(
    cardRef: RefObject<HTMLElement | null>,
): BarPlacement {
    const [placement, setPlacement] = useState<BarPlacement>('right');

    const recalculate = useCallback(() => {
        if (!cardRef.current) {
            setPlacement('right');
            return;
        }
        const rect = cardRef.current.getBoundingClientRect();
        const distanceFromEdge = window.innerWidth - rect.right;
        setPlacement(distanceFromEdge < FLIP_THRESHOLD_PX ? 'left' : 'right');
    }, [cardRef]);

    useEffect(() => {
        recalculate();

        window.addEventListener('resize', recalculate, { passive: true });
        window.addEventListener('scroll', recalculate, { passive: true });

        return () => {
            window.removeEventListener('resize', recalculate);
            window.removeEventListener('scroll', recalculate);
        };
    }, [recalculate]);

    return placement;
}
