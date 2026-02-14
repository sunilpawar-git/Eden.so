/**
 * useBarPinOpen — Pin the NodeUtilsBar open via right-click or long-press
 * Right-click (contextmenu) toggles; long-press (400ms touch) toggles.
 * Escape key dismisses the pinned state.
 */
import { useState, useCallback, useRef, useEffect, type MouseEvent } from 'react';

/** Long-press threshold in ms */
const LONG_PRESS_THRESHOLD_MS = 400;

interface BarPinOpenHandlers {
    onContextMenu: (e: MouseEvent) => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
}

interface UseBarPinOpenResult {
    isPinnedOpen: boolean;
    handlers: BarPinOpenHandlers;
}

export function useBarPinOpen(): UseBarPinOpenResult {
    const [isPinnedOpen, setIsPinnedOpen] = useState(false);
    const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onContextMenu = useCallback((e: MouseEvent) => {
        e.preventDefault();
        setIsPinnedOpen((prev) => !prev);
    }, []);

    const onTouchStart = useCallback(() => {
        // Clear any existing timer to prevent double-toggle on rapid touch
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        touchTimerRef.current = setTimeout(() => {
            setIsPinnedOpen((prev) => !prev);
            touchTimerRef.current = null;
        }, LONG_PRESS_THRESHOLD_MS);
    }, []);

    const onTouchEnd = useCallback(() => {
        if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
        }
    }, []);

    // Escape key dismisses
    useEffect(() => {
        if (!isPinnedOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsPinnedOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isPinnedOpen]);

    // Cleanup touch timer on unmount
    useEffect(() => () => {
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    }, []);

    return {
        isPinnedOpen,
        handlers: { onContextMenu, onTouchStart, onTouchEnd },
    };
}
