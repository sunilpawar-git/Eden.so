/**
 * useSidebarHover — manages hover open/close and Escape key for unpinned sidebar
 * Encapsulates mouseenter/mouseleave on trigger zone + keyboard dismiss
 */
import { useRef, useEffect, useCallback } from 'react';
import { useSidebarStore } from '@/shared/stores/sidebarStore';

export function useSidebarHover() {
    const isPinned = useSidebarStore((s) => s.isPinned);
    const triggerZoneRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        const state = useSidebarStore.getState();
        if (!state.isPinned) state.setHoverOpen(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        const state = useSidebarStore.getState();
        if (!state.isPinned) state.setHoverOpen(false);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const state = useSidebarStore.getState();
        if (e.key !== 'Escape' || state.isPinned || !state.isHoverOpen) return;
        const tag = (document.activeElement?.tagName ?? '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        state.setHoverOpen(false);
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

    useEffect(() => {
        if (isPinned) return;
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isPinned, handleKeyDown]);

    return { triggerZoneRef };
}
