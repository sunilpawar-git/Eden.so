/**
 * useOverflowAutoOpen — Manages overflow bar open state.
 *
 * Two modes:
 *   auto   — triggered by 600ms hover; closes on mouseleave
 *   manual — triggered by toggle(); stays open until toggled again
 *
 * Callbacks are stable (ref-based internally) so they won't cause
 * extra renders when attached to container mouseEnter/Leave handlers.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export function useOverflowAutoOpen(openDelayMs = 600) {
    const [isOpen, setIsOpen] = useState(false);
    const isAutoRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    const handleMouseEnter = useCallback(() => {
        clearTimer();
        timerRef.current = setTimeout(() => {
            isAutoRef.current = true;
            setIsOpen(true);
        }, openDelayMs);
    }, [openDelayMs]);

    const handleMouseLeave = useCallback(() => {
        clearTimer();
        if (isAutoRef.current) {
            isAutoRef.current = false;
            setIsOpen(false);
        }
    }, []);

    const toggle = useCallback(() => {
        clearTimer();
        isAutoRef.current = false;
        setIsOpen((prev) => !prev);
    }, []);

    useEffect(() => () => clearTimer(), []);

    return { isOpen, toggle, handleMouseEnter, handleMouseLeave };
}
