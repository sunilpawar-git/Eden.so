/**
 * useNodeUtilsBar — Logic for NodeUtilsBar: submenu toggles, outside-click handling.
 * Extracted for CLAUDE.md 100-line component limit.
 */
import { useRef, useCallback, useEffect } from 'react';
import { useNodeUtilsController } from './useNodeUtilsController';
import { useNodeUtilsBarOutsideHandlers } from './useNodeUtilsBarOutsideHandlers';

interface UseNodeUtilsBarProps {
    isPinnedOpen?: boolean;
}

export function useNodeUtilsBar(props: UseNodeUtilsBarProps) {
    const { isPinnedOpen = false } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const { state, actions: controllerActions } = useNodeUtilsController(isPinnedOpen);
    const {
        onOutsidePointer,
        onEscape,
        handleHoverEnter,
        handleHoverLeave: controllerHoverLeave,
        toggleDeckTwo,
        handleDeckTwoHoverEnter,
        handleDeckTwoHoverLeave,
        openSubmenu,
        closeSubmenu,
        handleProximityLost,
    } = controllerActions;

    const handleHoverLeave = useCallback((event?: { relatedTarget?: EventTarget | null }) => {
        if (event?.relatedTarget instanceof Node && containerRef.current?.contains(event.relatedTarget)) {
            return;
        }
        controllerHoverLeave(event);
    }, [controllerHoverLeave]);

    const isDeckTwoOpen = state.isDeckTwoOpen;
    const isShareOpen = state.activeSubmenu === 'share';
    const isTransformOpen = state.activeSubmenu === 'transform';
    const isColorOpen = state.activeSubmenu === 'color';

    const isActive = isShareOpen || isTransformOpen || isColorOpen || isDeckTwoOpen;
    useNodeUtilsBarOutsideHandlers(containerRef, isActive, onEscape, onOutsidePointer);

    useEffect(() => {
        if (!containerRef.current) return;
        if (isActive) {
            containerRef.current.setAttribute('data-bar-active', 'true');
        } else {
            containerRef.current.removeAttribute('data-bar-active');
        }
    }, [isActive]);

    const handleShareToggle = useCallback(() => {
        if (isShareOpen) closeSubmenu();
        else openSubmenu('share');
    }, [closeSubmenu, openSubmenu, isShareOpen]);

    const handleTransformToggle = useCallback(() => {
        if (isTransformOpen) closeSubmenu();
        else openSubmenu('transform');
    }, [closeSubmenu, openSubmenu, isTransformOpen]);

    const handleColorToggle = useCallback(() => {
        if (isColorOpen) closeSubmenu();
        else openSubmenu('color');
    }, [closeSubmenu, openSubmenu, isColorOpen]);

    return {
        containerRef,
        handleHoverEnter,
        handleHoverLeave,
        handleProximityLost,
        toggleDeckTwo,
        handleDeckTwoHoverEnter,
        handleDeckTwoHoverLeave,
        closeSubmenu,
        isDeckTwoOpen,
        isShareOpen,
        isTransformOpen,
        isColorOpen,
        handleShareToggle,
        handleTransformToggle,
        handleColorToggle,
    };
}
