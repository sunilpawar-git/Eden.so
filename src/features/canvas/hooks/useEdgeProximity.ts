/**
 * useEdgeProximity — Detects when cursor is near the card's right edge
 * Returns true when the cursor is within `threshold` px of the right edge
 * and vertically within the card bounds. Uses passive mousemove + rAF throttle.
 */
import { useState, useEffect, useRef, type RefObject } from 'react';

/** Default proximity threshold in pixels */
const DEFAULT_THRESHOLD_PX = 20;

export function useEdgeProximity(
    cardRef: RefObject<HTMLElement | null>,
    threshold: number = DEFAULT_THRESHOLD_PX,
): boolean {
    const [isNear, setIsNear] = useState(false);
    const rafIdRef = useRef<number>(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = requestAnimationFrame(() => {
                if (!cardRef.current) {
                    setIsNear(false);
                    return;
                }
                const rect = cardRef.current.getBoundingClientRect();
                const withinVertical = e.clientY >= rect.top && e.clientY <= rect.bottom;
                const distanceFromRight = Math.abs(e.clientX - rect.right);
                const withinThreshold = distanceFromRight <= threshold && e.clientX >= rect.left;

                setIsNear(withinVertical && withinThreshold);
            });
        };

        document.addEventListener('mousemove', handleMouseMove, { passive: true });

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(rafIdRef.current);
        };
    }, [cardRef, threshold]);

    return isNear;
}
