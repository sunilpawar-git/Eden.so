/**
 * useSidebarHover — manages hover open/close and Escape key for unpinned sidebar
 * Encapsulates mouseenter/mouseleave on trigger zone + keyboard dismiss
 */
import { useRef, useEffect, useCallback } from 'react';
import { useSidebarStore } from '@/shared/stores/sidebarStore';

export function useSidebarHover() {
    const isPinned = useSidebarStore((s) => s.isPinned);
    const isHoverOpen = useSidebarStore((s) => s.isHoverOpen);
    const setHoverOpen = useSidebarStore((s) => s.setHoverOpen);
    const triggerZoneRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (!isPinned) setHoverOpen(true);
    }, [isPinned, setHoverOpen]);

    const handleMouseLeave = useCallback(() => {
        if (!isPinned) setHoverOpen(false);
    }, [isPinned, setHoverOpen]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isPinned && isHoverOpen) {
            setHoverOpen(false);
        }
    }, [isPinned, isHoverOpen, setHoverOpen]);

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
