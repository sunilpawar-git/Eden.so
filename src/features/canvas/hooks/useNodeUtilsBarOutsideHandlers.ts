/**
 * useNodeUtilsBarOutsideHandlers — Escape/outside-click handlers for NodeUtilsBar overflow.
 * Extracted for max-lines-per-function lint rule.
 */
import { useEffect } from 'react';
import { NODE_UTILS_PORTAL_ATTR } from './useNodeUtilsController';

export function useNodeUtilsBarOutsideHandlers(
    containerRef: React.RefObject<HTMLDivElement | null>,
    overflowOpenRef: React.MutableRefObject<boolean>,
    onEscape: () => void,
    onOutsidePointer: () => void,
) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!overflowOpenRef.current) return;
            if (event.key === 'Escape') onEscape();
        };
        const onPointerDown = (event: MouseEvent) => {
            if (!overflowOpenRef.current) return;
            const target = event.target as Node | null;
            if (!target) return;
            const element = target instanceof HTMLElement ? target : null;
            const insideToolbar = element ? containerRef.current?.contains(element) : false;
            const insidePortalZone = element?.closest(`[${NODE_UTILS_PORTAL_ATTR}="true"]`) != null;
            if (insideToolbar || insidePortalZone) return;
            onOutsidePointer();
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('mousedown', onPointerDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('mousedown', onPointerDown, true);
        };
    }, [containerRef, overflowOpenRef, onEscape, onOutsidePointer]);
}
