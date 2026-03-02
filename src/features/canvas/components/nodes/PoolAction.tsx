/**
 * PoolAction — AI Memory toggle button for NodeUtilsBar.
 * Renders MemoryChipIcon (filled when active) with portal tooltip.
 * Memoized per CLAUDE.md performance rules (500+ node canvases).
 */
import React, { useRef, useCallback, useId, useState } from 'react';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import { MemoryChipIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import styles from './TooltipButton.module.css';

const POOL_ACTIVE_STYLE = { color: 'var(--color-pool-active)' } as const;

interface PoolActionProps {
    isInPool: boolean;
    onToggle: () => void;
    disabled?: boolean;
    tooltipPlacement?: 'right' | 'left';
}

export const PoolAction = React.memo(function PoolAction({
    isInPool,
    onToggle,
    disabled = false,
    tooltipPlacement = 'right',
}: PoolActionProps) {
    const [hovered, setHovered] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipId = useId();
    const isTooltipVisible = hovered && !disabled;
    const tooltipText = isInPool ? strings.nodePool.removeFromPool : strings.nodePool.addToPool;

    const handleMouseEnter = useCallback(() => setHovered(true), []);
    const handleMouseLeave = useCallback(() => setHovered(false), []);

    return (
        <>
            <button
                ref={buttonRef}
                className={styles.actionButton}
                onClick={onToggle}
                disabled={disabled}
                aria-label={tooltipText}
                aria-describedby={isTooltipVisible ? tooltipId : undefined}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={isInPool ? POOL_ACTIVE_STYLE : undefined}
            >
                <MemoryChipIcon size={16} filled={isInPool} />
            </button>
            <PortalTooltip
                text={tooltipText}
                targetRef={buttonRef}
                visible={isTooltipVisible}
                placement={tooltipPlacement}
                tooltipId={tooltipId}
            />
        </>
    );
});
