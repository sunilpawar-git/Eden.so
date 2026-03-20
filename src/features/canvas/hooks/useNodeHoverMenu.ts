/**
 * useNodeHoverMenu — Logic for NodeHoverMenu: transform submenu toggle, outside-click.
 * Simplified: no deck2, no share/color submenus (moved to Right-click Menu).
 */
import { useRef, useCallback, useEffect } from 'react';
import { useNodeHoverMenuController } from './useNodeHoverMenuController';
import { useNodeHoverMenuOutsideHandlers } from './useNodeHoverMenuOutsideHandlers';

export function useNodeHoverMenu() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { state, actions: controllerActions } = useNodeHoverMenuController();
    const {
        onOutsidePointer, onEscape,
        handleHoverEnter, handleHoverLeave: controllerHoverLeave,
        openSubmenu, closeSubmenu, handleProximityLost,
    } = controllerActions;

    const handleHoverLeave = useCallback((event?: { relatedTarget?: EventTarget | null }) => {
        if (event?.relatedTarget instanceof Node && containerRef.current?.contains(event.relatedTarget)) {
            return;
        }
        controllerHoverLeave(event);
    }, [controllerHoverLeave]);

    const isTransformOpen = state.activeSubmenu === 'transform';
    const isActive = isTransformOpen;
    useNodeHoverMenuOutsideHandlers(containerRef, isActive, onEscape, onOutsidePointer);

    useEffect(() => {
        if (!containerRef.current) return;
        if (isActive) {
            containerRef.current.setAttribute('data-bar-active', 'true');
        } else {
            containerRef.current.removeAttribute('data-bar-active');
        }
    }, [isActive]);

    const handleTransformToggle = useCallback(() => {
        if (isTransformOpen) closeSubmenu();
        else openSubmenu('transform');
    }, [closeSubmenu, openSubmenu, isTransformOpen]);

    return {
        containerRef,
        handleHoverEnter,
        handleHoverLeave,
        handleProximityLost,
        closeSubmenu,
        isTransformOpen,
        handleTransformToggle,
    };
}
