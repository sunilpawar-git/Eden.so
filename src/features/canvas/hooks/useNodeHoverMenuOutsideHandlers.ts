/**
 * useNodeHoverMenuOutsideHandlers — Escape/outside-click handlers for NodeHoverMenu.
 * Escape is handled via centralized useEscapeLayer; outside-click via document mousedown.
 */
import { useEffect } from 'react';
import { NODE_HOVER_MENU_PORTAL_ATTR } from './useNodeHoverMenuController';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';

export function useNodeHoverMenuOutsideHandlers(
    containerRef: React.RefObject<HTMLDivElement | null>,
    isActive: boolean,
    onEscape: () => void,
    onOutsidePointer: () => void,
) {
    useEscapeLayer(ESCAPE_PRIORITY.BAR_OVERFLOW, isActive, onEscape);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (!isActive) return;
            const target = event.target as Node | null;
            if (!target) return;
            const element = target instanceof HTMLElement ? target : null;
            const insideToolbar = element ? containerRef.current?.contains(element) : false;
            const insidePortalZone = element?.closest(`[${NODE_HOVER_MENU_PORTAL_ATTR}="true"]`) != null;
            if (insideToolbar || insidePortalZone) return;
            onOutsidePointer();
        };
        document.addEventListener('mousedown', onPointerDown, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown, true);
        };
    }, [containerRef, isActive, onOutsidePointer]);
}
