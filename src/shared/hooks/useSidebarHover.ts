/**
 * useSidebarHover — manages hover open/close and Escape key for unpinned sidebar
 * Encapsulates mouseenter/mouseleave on trigger zone + keyboard dismiss
 */
import { useRef, useEffect, useCallback } from 'react';
import { useSidebarStore } from '@/shared/stores/sidebarStore';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';

export function useSidebarHover() {
    const isPinned = useSidebarStore((s) => s.isPinned);
    const isHoverOpen = useSidebarStore((s) => s.isHoverOpen);
    const triggerZoneRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        const state = useSidebarStore.getState();
        if (!state.isPinned) state.setHoverOpen(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        const state = useSidebarStore.getState();
        if (!state.isPinned) state.setHoverOpen(false);
    }, []);

    const handleEscape = useCallback(() => {
        useSidebarStore.getState().setHoverOpen(false);
    }, []);

    useEffect(() => {
        const el = triggerZoneRef.current;
        if (!el || isPinned) return;

        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            el.removeEventListener('mouseenter', handleMouseEnter);
            el.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isPinned, handleMouseEnter, handleMouseLeave]);

    useEscapeLayer(ESCAPE_PRIORITY.SIDEBAR_HOVER, !isPinned && isHoverOpen, handleEscape);

    return { triggerZoneRef };
}
