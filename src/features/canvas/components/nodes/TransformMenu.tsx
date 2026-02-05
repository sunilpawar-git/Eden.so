/**
 * TransformMenu - Dropdown menu for AI text transformations
 * Provides options: Refine, Shorten, Lengthen, Proofread
 * Uses React Portal to escape parent overflow constraints
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import styles from './TransformMenu.module.css';

interface TransformMenuProps {
    onTransform: (type: TransformationType) => void;
    disabled?: boolean;
    isTransforming?: boolean;
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
    disabled = false,
    isTransforming = false,
}: TransformMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
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

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
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
                data-tooltip={buttonLabel}
            >
                <span className={styles.icon}>
                    {isTransforming ? '⏳' : '✨'}
                </span>
            </button>
            
            {dropdownMenu && createPortal(dropdownMenu, document.body)}
        </div>
    );
});
