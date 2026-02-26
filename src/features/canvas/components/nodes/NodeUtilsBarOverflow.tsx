/**
 * NodeUtilsBarOverflow — Overflow menu with ColorMenu and ShareMenu for NodeUtilsBar.
 * Extracted for CLAUDE.md 100-line limit.
 */
import React from 'react';
import { OverflowMenu } from './OverflowMenu';
import { ColorMenu } from './ColorMenu';
import { ShareMenu } from './ShareMenu';
import type { OverflowMenuItem } from './OverflowMenu';
import type { NodeColorKey } from '../../types/node';

export interface NodeUtilsBarOverflowProps {
    items: OverflowMenuItem[];
    isOpen: boolean;
    onToggle: () => void;
    /** Hover-intent callbacks for the ••• (More) button */
    onMoreHoverEnter: () => void;
    onMoreHoverLeave: () => void;
    disabled: boolean;
    tooltipPlacement: 'left' | 'right';
    onColorChange?: (colorKey: NodeColorKey) => void;
    isColorOpen: boolean;
    onColorToggle: () => void;
    onCloseSubmenu: () => void;
    nodeColorKey: NodeColorKey;
    onShareClick?: (targetWorkspaceId: string) => Promise<void>;
    isShareOpen: boolean;
    onShareToggle: () => void;
    isSharing: boolean;
}

export const NodeUtilsBarOverflow = React.memo(function NodeUtilsBarOverflow({
    items,
    isOpen,
    onToggle,
    onMoreHoverEnter,
    onMoreHoverLeave,
    disabled,
    tooltipPlacement,
    onColorChange,
    isColorOpen,
    onColorToggle,
    onCloseSubmenu,
    nodeColorKey,
    onShareClick,
    isShareOpen,
    onShareToggle,
    isSharing,
}: NodeUtilsBarOverflowProps) {
    return (
        <OverflowMenu
            items={items}
            isOpen={isOpen}
            onToggle={onToggle}
            onMoreHoverEnter={onMoreHoverEnter}
            onMoreHoverLeave={onMoreHoverLeave}
            disabled={disabled}
            tooltipPlacement={tooltipPlacement}
        >
            {onColorChange && (
                <ColorMenu
                    isOpen={isColorOpen}
                    onToggle={onColorToggle}
                    onClose={onCloseSubmenu}
                    selectedColorKey={nodeColorKey}
                    onColorSelect={onColorChange}
                    disabled={disabled}
                    tooltipPlacement={tooltipPlacement}
                />
            )}
            {onShareClick && (
                <ShareMenu
                    onShare={onShareClick}
                    isOpen={isShareOpen}
                    onToggle={onShareToggle}
                    onClose={onCloseSubmenu}
                    isSharing={isSharing}
                    disabled={disabled}
                    tooltipPlacement={tooltipPlacement}
                />
            )}
        </OverflowMenu>
    );
});
