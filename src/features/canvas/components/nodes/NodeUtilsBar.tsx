/**
 * NodeUtilsBar — Floating pill action bar tucked behind node.
 * Primary actions always visible; secondary actions in inline overflow.
 * Auto-opens overflow after 600ms hover (closes on leave if auto-opened).
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { forwardRef } from 'react';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBarPrimaryButtons } from './NodeUtilsBarPrimaryButtons';
import { NodeUtilsBarOverflow } from './NodeUtilsBarOverflow';
import { useNodeUtilsBar } from '../../hooks/useNodeUtilsBar';
import type { NodeUtilsBarProps } from './NodeUtilsBar.types';
import styles from './NodeUtilsBar.module.css';

// eslint-disable-next-line max-lines-per-function -- Orchestrator; sub-components handle detail
export const NodeUtilsBar = React.memo(forwardRef<HTMLDivElement, NodeUtilsBarProps>(function NodeUtilsBar({
    onTagClick,
    onImageClick,
    onAIClick,
    onConnectClick,
    onCopyClick,
    onDuplicateClick,
    onShareClick,
    isSharing = false,
    onColorChange,
    nodeColorKey = 'default',
    onFocusClick,
    onDelete,
    onTransform,
    onRegenerate,
    onPinToggle,
    onCollapseToggle,
    hasContent = false,
    isTransforming = false,
    isPinned = false,
    isCollapsed = false,
    disabled = false,
    isPinnedOpen = false,
}, ref) {
    const bar = useNodeUtilsBar({ onTagClick, onImageClick, onDuplicateClick, onFocusClick, onCollapseToggle, onShareClick, onColorChange, isCollapsed, isPinnedOpen });

    return (
        <div ref={ref} className={styles.barWrapper}>
            <div
                ref={bar.containerRef}
                className={[styles.container, isPinnedOpen && styles.containerPinnedOpen].filter(Boolean).join(' ')}
                role="toolbar"
                aria-label={strings.canvas.nodeActionsLabel}
                onMouseEnter={bar.handleHoverEnter}
                onMouseLeave={bar.handleHoverLeave}
            >
                <NodeUtilsBarPrimaryButtons
                    onTransform={onTransform}
                    isTransformOpen={bar.isTransformOpen}
                    onTransformToggle={bar.handleTransformToggle}
                    onCloseSubmenu={bar.closeSubmenu}
                    onRegenerate={onRegenerate}
                    disabled={disabled}
                    hasContent={hasContent}
                    isTransforming={isTransforming}
                    tooltipPlacement="right"
                    onAIClick={onAIClick}
                    onConnectClick={onConnectClick}
                    onCopyClick={onCopyClick}
                    onPinToggle={onPinToggle}
                    onDelete={onDelete}
                    isPinned={isPinned}
                />
                {bar.hasOverflow && (
                    <NodeUtilsBarOverflow
                        items={bar.overflowItems}
                        isOpen={bar.overflowOpen}
                        onToggle={bar.toggleOverflow}
                        onMoreHoverEnter={bar.handleMoreHoverEnter}
                        onMoreHoverLeave={bar.handleMoreHoverLeave}
                        disabled={disabled}
                        tooltipPlacement="right"
                        onColorChange={onColorChange}
                        isColorOpen={bar.isColorOpen}
                        onColorToggle={bar.handleColorToggle}
                        onCloseSubmenu={bar.closeSubmenu}
                        nodeColorKey={nodeColorKey}
                        onShareClick={onShareClick}
                        isShareOpen={bar.isShareOpen}
                        onShareToggle={bar.handleShareToggle}
                        isSharing={isSharing}
                    />
                )}
            </div>
            <div className={styles.peekIndicator} aria-hidden="true" />
        </div>
    );
}));
