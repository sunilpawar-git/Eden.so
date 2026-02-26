/**
 * useNodeUtilsBarOutsideHandlers — Escape/outside-click handlers for NodeUtilsBar overflow.
 * Escape is handled via centralized useEscapeLayer; outside-click via document mousedown.
 */
import { useEffect } from 'react';
import { NODE_UTILS_PORTAL_ATTR } from './useNodeUtilsController';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';

export function useNodeUtilsBarOutsideHandlers(
    containerRef: React.RefObject<HTMLDivElement | null>,
    overflowOpen: boolean,
    onEscape: () => void,
    onOutsidePointer: () => void,
) {
    useEscapeLayer(ESCAPE_PRIORITY.BAR_OVERFLOW, overflowOpen, onEscape);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (!overflowOpen) return;
            const target = event.target as Node | null;
            if (!target) return;
            const element = target instanceof HTMLElement ? target : null;
            const insideToolbar = element ? containerRef.current?.contains(element) : false;
            const insidePortalZone = element?.closest(`[${NODE_UTILS_PORTAL_ATTR}="true"]`) != null;
            if (insideToolbar || insidePortalZone) return;
            onOutsidePointer();
        };
        document.addEventListener('mousedown', onPointerDown, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown, true);
        };
    }, [containerRef, overflowOpen, onOutsidePointer]);
}
