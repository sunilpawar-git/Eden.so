/**
 * useBarPlacement — Determines whether NodeUtilsBar appears on right or left
 * Flips to left when the node is near the right edge of the viewport,
 * preventing the bar from rendering off-screen.
 *
 * Recalculates when:
 * - `isVisible` changes (hover start/end — covers canvas pan + drag)
 * - Window is resized
 *
 * Note: getBoundingClientRect() already returns screen-space coordinates
 * which account for ReactFlow's CSS viewport transforms.
 */
import { useState, useEffect, useCallback, type RefObject } from 'react';

/** Distance (px) from viewport right edge that triggers left-flip */
const FLIP_THRESHOLD_PX = 60;

export type BarPlacement = 'right' | 'left';

export function useBarPlacement(
    cardRef: RefObject<HTMLElement | null>,
    isVisible: boolean = false,
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

    // Recalculate whenever visibility changes (covers pan, drag, scroll)
    useEffect(() => {
        recalculate();
    }, [recalculate, isVisible]);

    // Also recalculate on window resize
    useEffect(() => {
        window.addEventListener('resize', recalculate, { passive: true });
        return () => window.removeEventListener('resize', recalculate);
    }, [recalculate]);

    return placement;
}
