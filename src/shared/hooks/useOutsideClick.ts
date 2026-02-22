import { useEffect, type RefObject } from 'react';

/** 
 * Hook to handle clicks outside a specified element.
 * 
 * @param ref Reference to the container element
 * @param active Whether the listener should be active
 * @param onClose Callback triggered when clicking outside the element
 */
export function useOutsideClick(
    ref: RefObject<HTMLElement | null>,
    active: boolean,
    onClose: () => void
): void {
    useEffect(() => {
        if (!active) return;

        const handler = (e: MouseEvent | TouchEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);

        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [active, ref, onClose]);
}
