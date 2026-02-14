/**
 * TransformMenu - Dropdown menu for AI text transformations
 * Provides options: Refine, Shorten, Lengthen, Proofread
 * Uses React Portal to escape parent overflow constraints
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import type { PortalTooltipProps } from '@/shared/components/PortalTooltip';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import styles from './TransformMenu.module.css';

interface TransformMenuProps {
    onTransform: (type: TransformationType) => void;
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

// eslint-disable-next-line max-lines-per-function -- transform menu with portal positioning
export const TransformMenu = React.memo(({
    onTransform,
    onRegenerate,
    disabled = false,
    isTransforming = false,
    tooltipPlacement,
}: TransformMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    // Close menu when clicking outside (portal-aware)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isInsideMenu = menuRef.current?.contains(target);
            const isInsideButton = buttonRef.current?.contains(target);

            if (!isInsideMenu && !isInsideButton) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Use capture phase to intercept event before React Flow stops propagation
            document.addEventListener('mousedown', handleClickOutside, true);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside, true);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen]);

    const handleToggle = useCallback(() => {
        if (!disabled && !isTransforming) {
            setIsOpen((prev) => !prev);
        }
    }, [disabled, isTransforming]);

    const handleSelect = useCallback((type: TransformationType) => {
        setIsOpen(false);
        onTransform(type);
    }, [onTransform]);

    const handleRegenerate = useCallback(() => {
        setIsOpen(false);
        onRegenerate?.();
    }, [onRegenerate]);

    const buttonLabel = isTransforming
        ? strings.ideaCard.transforming
        : strings.ideaCard.transform;

    const dropdownMenu = isOpen ? (
        <div
            ref={menuRef}
            className={styles.dropdownMenu}
            role="menu"
            data-testid="transform-menu-portal"
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
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
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
