/**
 * TransformMenu - Dropdown menu for AI text transformations
 * Provides options: Refine, Shorten, Lengthen, Proofread
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
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
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

    return (
        <div className={styles.transformMenuWrapper} ref={menuRef}>
            <button
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
            
            {isOpen && (
                <div className={styles.dropdownMenu} role="menu">
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
            )}
        </div>
    );
});
