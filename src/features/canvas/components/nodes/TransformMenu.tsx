/**
 * TransformMenu — Controlled dropdown for AI text transformations.
 * Open/close is owned by parent controller.
 * Hover state uses useCssHover to avoid cascading re-renders.
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import type { PortalTooltipProps } from '@/shared/components/PortalTooltip';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { NODE_UTILS_PORTAL_ATTR } from '../../hooks/useNodeUtilsController';
import { useCssHover } from '../../hooks/useCssHover';
import styles from './TransformMenu.module.css';

interface TransformMenuProps {
    onTransform: (type: TransformationType) => void;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    onRegenerate?: () => void;
    disabled?: boolean;
    isTransforming?: boolean;
    /** Tooltip placement — forwarded from NodeUtilsBar */
    tooltipPlacement?: PortalTooltipProps['placement'];
}

/**
 * Transformation options configuration (SSOT)
 */
const TRANSFORM_OPTIONS: Array<{
    type: TransformationType;
    labelKey: keyof typeof strings.transformations;
}> = [
        { type: 'refine', labelKey: 'refine' },
        { type: 'shorten', labelKey: 'shorten' },
        { type: 'lengthen', labelKey: 'lengthen' },
        { type: 'proofread', labelKey: 'proofread' },
    ];

export const TransformMenu = React.memo(({
    onTransform,
    isOpen,
    onToggle,
    onClose,
    onRegenerate,
    disabled = false,
    isTransforming = false,
    tooltipPlacement,
}: TransformMenuProps) => {
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isHovered = useCssHover(buttonRef);

    // Calculate menu position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.top,
                left: rect.left + rect.width / 2,
            });
        }
    }, [isOpen]);

    const handleToggle = useCallback(() => {
        if (!disabled && !isTransforming) {
            onToggle();
        }
    }, [disabled, isTransforming, onToggle]);

    const handleSelect = useCallback((type: TransformationType) => {
        onClose();
        onTransform(type);
    }, [onClose, onTransform]);

    const handleRegenerate = useCallback(() => {
        onClose();
        onRegenerate?.();
    }, [onClose, onRegenerate]);

    const buttonLabel = isTransforming
        ? strings.ideaCard.transforming
        : strings.ideaCard.transform;

    const dropdownMenu = isOpen ? (
        <div
            className={styles.dropdownMenu}
            role="menu"
            data-testid="transform-menu-portal"
            {...{ [NODE_UTILS_PORTAL_ATTR]: 'true' }}
            style={{ top: menuPosition.top, left: menuPosition.left }}
        >
            {TRANSFORM_OPTIONS.map(({ type, labelKey }) => (
                <button
                    key={type}
                    className={styles.menuItem}
                    onClick={() => handleSelect(type)}
                    role="menuitem"
                >
                    {strings.transformations[labelKey]}
                </button>
            ))}
            {onRegenerate && (
                <button
                    className={styles.menuItem}
                    onClick={handleRegenerate}
                    role="menuitem"
                >
                    {strings.nodeUtils.regenerate}
                </button>
            )}
        </div>
    ) : null;

    return (
        <div className={styles.transformMenuWrapper}>
            <button
                ref={buttonRef}
                className={styles.transformButton}
                onClick={handleToggle}
                disabled={disabled || isTransforming}
                aria-label={buttonLabel}
                aria-expanded={isOpen}
                aria-haspopup="menu"
            >
                <span className={styles.icon}>
                    {isTransforming ? '⏳' : '✨'}
                </span>
            </button>
            <PortalTooltip
                text={buttonLabel}
                targetRef={buttonRef}
                visible={isHovered && !isOpen && !(disabled || isTransforming)}
                placement={tooltipPlacement}
            />

            {dropdownMenu && createPortal(dropdownMenu, document.body)}
        </div>
    );
});
