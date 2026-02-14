/**
 * TooltipButton — Action button with portal-based tooltip on hover
 * Wraps a single icon button and manages its own hover state + PortalTooltip.
 * Extracted from NodeUtilsBar to keep each file under SRP.
 */
import { useState, useRef, useCallback } from 'react';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import type { PortalTooltipProps } from '@/shared/components/PortalTooltip';
import styles from './NodeUtilsBar.module.css';

export interface TooltipButtonProps {
    /** Accessible label (aria-label) */
    label: string;
    /** Tooltip text shown on hover */
    tooltipText: string;
    /** Optional keyboard shortcut hint (e.g. "⌫") */
    shortcut?: string;
    /** Emoji or icon content */
    icon: string;
    /** Click handler */
    onClick: () => void;
    /** Whether button is disabled */
    disabled?: boolean;
    /** Additional CSS class (e.g. deleteButton) */
    className?: string;
    /** Tooltip placement — forwarded to PortalTooltip */
    tooltipPlacement?: PortalTooltipProps['placement'];
}

export function TooltipButton({
    label,
    tooltipText,
    shortcut,
    icon,
    onClick,
    disabled = false,
    className,
    tooltipPlacement,
}: TooltipButtonProps) {
    const [hovered, setHovered] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleMouseEnter = useCallback(() => setHovered(true), []);
    const handleMouseLeave = useCallback(() => setHovered(false), []);

    const buttonClass = className
        ? `${styles.actionButton} ${className}`
        : styles.actionButton;

    return (
        <>
            <button
                ref={buttonRef}
                className={buttonClass}
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <span className={styles.icon}>{icon}</span>
            </button>
            <PortalTooltip
                text={tooltipText}
                shortcut={shortcut}
                targetRef={buttonRef}
                visible={hovered && !disabled}
                placement={tooltipPlacement}
            />
        </>
    );
}
