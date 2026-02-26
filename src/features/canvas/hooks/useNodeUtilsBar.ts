/**
 * useNodeUtilsBar — Logic for NodeUtilsBar: overflow items, submenu toggles, outside handlers.
 * Extracted for CLAUDE.md 100-line component limit.
 */
import { useMemo, useRef, useCallback } from 'react';
import { useNodeUtilsController } from './useNodeUtilsController';
import { buildNodeUtilsOverflowItems } from './buildNodeUtilsOverflowItems';
import { useNodeUtilsBarOutsideHandlers } from './useNodeUtilsBarOutsideHandlers';
import type { NodeColorKey } from '../types/node';

interface UseNodeUtilsBarProps {
    onTagClick: () => void;
    onImageClick?: () => void;
    onDuplicateClick?: () => void;
    onFocusClick?: () => void;
    onCollapseToggle?: () => void;
    onShareClick?: (targetWorkspaceId: string) => Promise<void>;
    onColorChange?: (colorKey: NodeColorKey) => void;
    isCollapsed?: boolean;
    isPinnedOpen?: boolean;
}

export function useNodeUtilsBar(props: UseNodeUtilsBarProps) {
    const {
        onTagClick,
        onImageClick,
        onDuplicateClick,
        onFocusClick,
        onCollapseToggle,
        onShareClick,
        onColorChange,
        isCollapsed = false,
        isPinnedOpen = false,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const overflowOpenRef = useRef(false);
    const { state, actions: controllerActions } = useNodeUtilsController(isPinnedOpen);
    const {
        onOutsidePointer,
        onEscape,
        handleHoverEnter,
        handleHoverLeave,
        toggleOverflow,
        openSubmenu,
        closeSubmenu,
    } = controllerActions;

    const overflowOpen = state.overflowOpen;
    overflowOpenRef.current = overflowOpen;
    const isShareOpen = state.activeSubmenu === 'share';
    const isTransformOpen = state.activeSubmenu === 'transform';
    const isColorOpen = state.activeSubmenu === 'color';

    useNodeUtilsBarOutsideHandlers(containerRef, overflowOpenRef, onEscape, onOutsidePointer);

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

    const overflowItems = useMemo(
        () =>
            buildNodeUtilsOverflowItems({
                onTagClick,
                onImageClick,
                onDuplicateClick,
                onFocusClick,
                onCollapseToggle,
                isCollapsed,
            }),
        [onTagClick, onImageClick, onDuplicateClick, onFocusClick, onCollapseToggle, isCollapsed],
    );

    const hasOverflow = overflowItems.length > 0 || !!onShareClick || !!onColorChange;

    return {
        containerRef,
        handleHoverEnter,
        handleHoverLeave,
        toggleOverflow,
        closeSubmenu,
        overflowItems,
        hasOverflow,
        overflowOpen,
        isShareOpen,
        isTransformOpen,
        isColorOpen,
        handleShareToggle,
        handleTransformToggle,
        handleColorToggle,
    };
}
