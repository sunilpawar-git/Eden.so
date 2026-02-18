/**
 * useSidebarHover — manages hover open/close for unpinned sidebar
 * Encapsulates mouseenter/mouseleave on trigger zone
 */
import { useRef, useEffect, useCallback } from 'react';
import { useSidebarStore } from '@/shared/stores/sidebarStore';

export function useSidebarHover() {
    const isPinned = useSidebarStore((s) => s.isPinned);
    const setHoverOpen = useSidebarStore((s) => s.setHoverOpen);
    const triggerZoneRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback(() => {
        if (!isPinned) setHoverOpen(true);
    }, [isPinned, setHoverOpen]);

    const handleMouseLeave = useCallback(() => {
        if (!isPinned) setHoverOpen(false);
    }, [isPinned, setHoverOpen]);

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

    return { triggerZoneRef };
}
