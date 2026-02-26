/**
 * OverflowMenu — Controlled inline expansion for secondary NodeUtilsBar actions.
 *
 * Items render directly inside the bar (no portal/dropdown).
 * isOpen and onToggle are controlled by the parent (NodeUtilsBar via useOverflowAutoOpen).
 * Trigger shows active state (ring/fill) when isOpen.
 * Hover state uses ref + CSS :hover instead of useState to avoid cascading re-renders.
 */
import React, { useCallback, useRef } from 'react';
import { strings } from '@/shared/localization/strings';
import { TooltipButton } from './TooltipButton';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import { useCssHover } from '../../hooks/useCssHover';
import buttonStyles from './TooltipButton.module.css';
import styles from './OverflowMenu.module.css';

export interface OverflowMenuItem {
    id: string;
    label: string;
    icon: string;
    onClick: () => void;
    disabled?: boolean;
}

interface OverflowMenuProps {
    items: OverflowMenuItem[];
    /** Complex slots (e.g. ShareMenu) — rendered inline when open */
    children?: React.ReactNode;
    /** Controlled open state from parent */
    isOpen: boolean;
    /** Called when trigger is clicked */
    onToggle: () => void;
    disabled?: boolean;
    tooltipPlacement?: 'left' | 'right';
}

/** Stable wrapper to avoid inline arrow in render — preserves TooltipButton memo */
function OverflowItem({ item, onToggle, disabled, tooltipPlacement }: {
    item: OverflowMenuItem;
    onToggle: () => void;
    disabled: boolean;
    tooltipPlacement: 'left' | 'right';
}) {
    const handleClick = useCallback(() => {
        onToggle();
        item.onClick();
    }, [onToggle, item]);

    return (
        <TooltipButton
            label={item.label}
            tooltipText={item.label}
            icon={item.icon}
            onClick={handleClick}
            disabled={item.disabled ?? disabled}
            tooltipPlacement={tooltipPlacement}
        />
    );
}

export const OverflowMenu = React.memo(function OverflowMenu({
    items,
    children,
    isOpen,
    onToggle,
    disabled = false,
    tooltipPlacement = 'right',
}: OverflowMenuProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isHovered = useCssHover(buttonRef);

    const triggerClass = [
        buttonStyles.actionButton,
        isOpen ? styles.triggerActive : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            {isOpen && items.map((item) => (
                <OverflowItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    disabled={disabled}
                    tooltipPlacement={tooltipPlacement}
                />
            ))}
            {isOpen && children}
            <button
                ref={buttonRef}
                className={triggerClass}
                onClick={onToggle}
                disabled={disabled}
                aria-label={strings.nodeUtils.more}
                aria-expanded={isOpen}
                aria-haspopup="menu"
            >
                <span className={buttonStyles.icon}>•••</span>
            </button>
            <PortalTooltip
                text={strings.nodeUtils.more}
                targetRef={buttonRef}
                visible={isHovered && !isOpen && !disabled}
                placement={tooltipPlacement}
            />
        </>
    );
});
