/**
 * NodeHoverMenu — Configurable floating bar tucked behind node.
 * Button order and visibility driven by user settings in settingsStore.
 * The "More…" button is always appended as the last item to open the Right-click Menu.
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { forwardRef, useCallback, useEffect, useMemo } from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { type ActionId } from '@/shared/stores/iconRegistry';
import { TooltipButton } from './TooltipButton';
import { renderHoverMenuButton, type HoverMenuButtonContext } from './renderHoverMenuButton';
import { useNodeHoverMenu } from '../../hooks/useNodeHoverMenu';
import type { NodeHoverMenuProps } from './NodeHoverMenu.types';
import styles from './NodeHoverMenu.module.css';

export const NodeHoverMenu = React.memo(forwardRef<HTMLDivElement, NodeHoverMenuProps>(
    function NodeHoverMenu(props, ref) {
        const { disabled = false, registerProximityLostFn, onCopyClick } = props;
        const bar = useNodeHoverMenu();
        const handleCopyClick = useCallback(() => { onCopyClick?.(); }, [onCopyClick]);

        // Read icon placement from settings (scalar selector — no destructuring)
        const hoverMenuIcons = useSettingsStore((s) => s.hoverMenuIcons);

        useEffect(() => {
            registerProximityLostFn?.(bar.handleProximityLost);
        }, [registerProximityLostFn, bar.handleProximityLost]);

        const mergedRef = useCallback((node: HTMLDivElement | null) => {
            /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- RefObject.current is readonly */
            (bar.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            /* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
        }, [bar.containerRef, ref]);

        /** Build context object for the external render helper */
        const buttonCtx: HoverMenuButtonContext = useMemo(() => ({
            props, disabled, handleCopyClick,
            isTransformOpen: bar.isTransformOpen,
            handleTransformToggle: bar.handleTransformToggle,
            closeSubmenu: bar.closeSubmenu,
        }), [props, disabled, handleCopyClick, bar.isTransformOpen, bar.handleTransformToggle, bar.closeSubmenu]);

        const renderButton = useCallback(
            (id: ActionId) => renderHoverMenuButton(id, buttonCtx),
            [buttonCtx],
        );

        return (
            <div ref={mergedRef} className={styles.barWrapper} data-node-section="hover-menu">
                <div
                    className={styles.deckOne}
                    role="toolbar"
                    aria-label={strings.canvas.nodeActionsLabel}
                    onMouseEnter={bar.handleHoverEnter}
                    onMouseLeave={bar.handleHoverLeave}
                >
                    {hoverMenuIcons.map(renderButton)}
                    {/* "More…" is always last — opens the Right-click Menu */}
                    <TooltipButton key="more"
                        label={strings.nodeUtils.more}
                        tooltipText={strings.nodeUtils.more}
                        icon={strings.nodeUtils.moreIcon}
                        onClick={props.onMoreClick}
                        disabled={disabled} tooltipPlacement="right"
                        aria-haspopup="true" />
                </div>
                <div className={styles.peekIndicator} aria-hidden="true" />
            </div>
        );
    },
));
