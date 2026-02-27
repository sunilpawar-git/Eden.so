/**
 * NodeUtilsBar — Dual-deck floating action bar tucked behind node.
 * Deck 1 cascades out on proximity; Deck 2 cascades out further right.
 * Layout driven by useUtilsBarLayout (settings store).
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { forwardRef, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { NodeUtilsBarDeckButtons } from './NodeUtilsBarDeckButtons';
import { TooltipButton } from './TooltipButton';
import { useNodeUtilsBar } from '../../hooks/useNodeUtilsBar';
import { useUtilsBarLayout } from '../../hooks/useUtilsBarLayout';
import type { NodeUtilsBarProps } from './NodeUtilsBar.types';
import styles from './NodeUtilsBar.module.css';

export const NodeUtilsBar = React.memo(forwardRef<HTMLDivElement, NodeUtilsBarProps>(function NodeUtilsBar(props, ref) {
    const { disabled = false, isPinnedOpen = false } = props;
    const bar = useNodeUtilsBar({ isPinnedOpen });
    const { deckOneActions, deckTwoActions } = useUtilsBarLayout();
    const deckOneCls = isPinnedOpen ? styles.deckOnePinned : styles.deckOne;
    const deckTwoBase = isPinnedOpen ? styles.deckTwoPinned : styles.deckTwo;
    const deckTwoCls = bar.isDeckTwoOpen ? `${deckTwoBase} ${styles.deckTwoOpen ?? ''}` : deckTwoBase;

    const mergedRef = useCallback((node: HTMLDivElement | null) => {
        /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- RefObject.current is readonly */
        (bar.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        /* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
    }, [bar.containerRef, ref]);

    return (
        <div ref={mergedRef} className={styles.barWrapper}>
            <div
                className={deckOneCls}
                role="toolbar"
                aria-label={strings.canvas.nodeActionsLabel}
                onMouseEnter={bar.handleHoverEnter}
                onMouseLeave={bar.handleHoverLeave}
            >
                <NodeUtilsBarDeckButtons actions={deckOneActions} props={props} bar={bar} />
                {deckTwoActions.length > 0 && (
                    <TooltipButton
                        label={strings.nodeUtils.expandDeck}
                        icon={strings.nodeUtils.expandDeckIcon}
                        onClick={bar.toggleDeckTwo}
                        onMouseEnter={bar.handleDeckTwoHoverEnter}
                        onMouseLeave={bar.handleDeckTwoHoverLeave}
                        disabled={disabled}
                        tooltipPlacement="right"
                        aria-expanded={bar.isDeckTwoOpen}
                    />
                )}
            </div>
            {deckTwoActions.length > 0 && (
                <div
                    className={deckTwoCls}
                    role="toolbar"
                    aria-label={strings.settings.toolbarBar2}
                    onMouseEnter={bar.handleHoverEnter}
                    onMouseLeave={bar.handleHoverLeave}
                >
                    <NodeUtilsBarDeckButtons actions={deckTwoActions} props={props} bar={bar} />
                </div>
            )}
            <div className={styles.peekIndicator} aria-hidden="true" />
        </div>
    );
}));
