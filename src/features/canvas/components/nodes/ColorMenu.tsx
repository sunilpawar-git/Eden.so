import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import type { PortalTooltipProps } from '@/shared/components/PortalTooltip';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import type { NodeColorKey } from '../../types/node';
import { NODE_UTILS_PORTAL_ATTR } from '../../hooks/useNodeUtilsController';
import { useCssHover } from '../../hooks/useCssHover';
import styles from './ColorMenu.module.css';

interface ColorMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    selectedColorKey: NodeColorKey;
    onColorSelect: (colorKey: NodeColorKey) => void;
    disabled?: boolean;
    tooltipPlacement?: PortalTooltipProps['placement'];
}

const COLOR_OPTIONS: Array<{ key: NodeColorKey; label: string; dotClass: string }> = [
    { key: 'default', label: strings.nodeUtils.nodeColorDefault, dotClass: styles.dotDefault ?? '' },
    { key: 'danger', label: strings.nodeUtils.nodeColorRed, dotClass: styles.dotDanger ?? '' },
    { key: 'warning', label: strings.nodeUtils.nodeColorYellow, dotClass: styles.dotWarning ?? '' },
    { key: 'success', label: strings.nodeUtils.nodeColorGreen, dotClass: styles.dotSuccess ?? '' },
];

export const ColorMenu = React.memo(function ColorMenu({
    isOpen,
    onToggle,
    onClose,
    selectedColorKey,
    onColorSelect,
    disabled = false,
    tooltipPlacement,
}: ColorMenuProps) {
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isHovered = useCssHover(buttonRef);

    useEffect(() => {
        if (!isOpen || !buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({ top: rect.top, left: rect.left + rect.width / 2 });
    }, [isOpen]);

    const handleSelect = useCallback((colorKey: NodeColorKey) => {
        if (disabled) return;
        onClose();
        if (colorKey !== selectedColorKey) onColorSelect(colorKey);
    }, [disabled, onClose, onColorSelect, selectedColorKey]);

    const isUnavailable = disabled;
    const triggerLabel = strings.nodeUtils.color;

    return (
        <div className={styles.wrapper}>
            <button
                ref={buttonRef}
                className={styles.colorButton}
                onClick={() => { if (!isUnavailable) onToggle(); }}
                disabled={isUnavailable}
                aria-label={triggerLabel}
                aria-expanded={isOpen}
                aria-haspopup="menu"
            >
                <span className={`${styles.dot} ${COLOR_OPTIONS.find((o) => o.key === selectedColorKey)?.dotClass ?? styles.dotDefault}`} />
            </button>
            <PortalTooltip
                text={triggerLabel}
                targetRef={buttonRef}
                visible={isHovered && !isOpen && !isUnavailable}
                placement={tooltipPlacement}
            />
            {isOpen && createPortal(
                <div
                    className={styles.dropdownMenu}
                    role="menu"
                    data-testid="color-menu-portal"
                    {...{ [NODE_UTILS_PORTAL_ATTR]: 'true' }}
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                    {COLOR_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            className={styles.menuItem}
                            onClick={() => handleSelect(option.key)}
                            role="menuitemradio"
                            aria-checked={selectedColorKey === option.key}
                        >
                            <span className={`${styles.dot} ${option.dotClass}`} />
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </div>
    );
});
