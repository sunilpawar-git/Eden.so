import { useEffect, useRef, useCallback } from 'react';

/**
 * Returns a debounced version of `callback`.
 * The returned function delays invocation until `delayMs` has elapsed since the last call.
 * Pending timers are cleared on unmount.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic callback signature
export function useDebouncedCallback<T extends (...args: any[]) => void>(
    callback: T,
    delayMs: number,
): (...args: Parameters<T>) => void {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
        };
    }, []);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                callbackRef.current(...args);
            }, delayMs);
        },
        [delayMs],
    );
}
