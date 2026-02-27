/**
 * useHoverIntent — Reusable hover-intent timer for delayed open on mouse hover.
 * Returns enter/leave/cancel handlers. Fires `onOpen` after `delayMs` if
 * the mouse stays on the target element.
 */
import { useCallback, useEffect, useRef } from 'react';

interface UseHoverIntentResult {
    onEnter: () => void;
    onLeave: () => void;
    cancel: () => void;
}

export function useHoverIntent(onOpen: () => void, delayMs: number): UseHoverIntentResult {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const onEnter = useCallback(() => {
        cancel();
        timerRef.current = setTimeout(onOpen, delayMs);
    }, [cancel, onOpen, delayMs]);

    const onLeave = useCallback(() => {
        cancel();
    }, [cancel]);

    useEffect(() => () => cancel(), [cancel]);

    return { onEnter, onLeave, cancel };
}
