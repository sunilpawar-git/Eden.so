/**
 * ShareMenu — Portal-based dropdown for cross-workspace node sharing.
 * Lists other workspaces owned by the user, excluding current and dividers.
 * Sources currentWorkspaceId internally from useWorkspaceStore.
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import type { PortalTooltipProps } from '@/shared/components/PortalTooltip';
import { strings } from '@/shared/localization/strings';
import styles from './ShareMenu.module.css';

interface ShareMenuProps {
    onShare: (targetWorkspaceId: string) => Promise<void>;
    isSharing?: boolean;
    disabled?: boolean;
    tooltipPlacement?: PortalTooltipProps['placement'];
}

export const ShareMenu = React.memo(function ShareMenu({
    onShare,
    isSharing = false,
    disabled = false,
    tooltipPlacement,
}: ShareMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const workspaces = useWorkspaceStore((s) => s.workspaces);

    const otherWorkspaces = useMemo(
        () => workspaces.filter((ws) => ws.id !== currentWorkspaceId && ws.type !== 'divider'),
        [workspaces, currentWorkspaceId],
    );

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({ top: rect.top, left: rect.left + rect.width / 2 });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleToggle = useCallback(() => {
        if (!disabled && !isSharing) setIsOpen((prev) => !prev);
    }, [disabled, isSharing]);

    const handleSelect = useCallback(
        (workspaceId: string) => {
            if (isSharing) return;
            setIsOpen(false);
            void onShare(workspaceId);
        },
        [onShare, isSharing],
    );

    const handleMouseEnter = useCallback(() => setIsHovered(true), []);
    const handleMouseLeave = useCallback(() => setIsHovered(false), []);

    const dropdownMenu = isOpen ? (
        <div
            ref={menuRef}
            className={`${styles.dropdownMenu} ${isSharing ? styles.sharing : ''}`}
            role="menu"
            aria-busy={isSharing}
            aria-label={strings.nodeUtils.shareToWorkspace}
            data-testid="share-menu-portal"
            style={{ top: menuPosition.top, left: menuPosition.left }}
        >
            {otherWorkspaces.length === 0 ? (
                <div className={styles.emptyMessage}>
                    {strings.nodeUtils.noOtherWorkspaces}
                </div>
            ) : (
                otherWorkspaces.map((ws) => (
                    <button
                        key={ws.id}
                        className={styles.menuItem}
                        onClick={() => handleSelect(ws.id)}
                        role="menuitem"
                        disabled={isSharing}
                    >
                        {ws.name}
                    </button>
                ))
            )}
        </div>
    ) : null;

    return (
        <div className={styles.shareMenuWrapper}>
            <button
                ref={buttonRef}
                className={styles.shareButton}
                onClick={handleToggle}
                disabled={disabled || isSharing}
                aria-label={strings.nodeUtils.share}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <span className={styles.icon}>📤</span>
            </button>
            <PortalTooltip
                text={strings.nodeUtils.share}
                targetRef={buttonRef}
                visible={isHovered && !isOpen && !disabled && !isSharing}
                placement={tooltipPlacement}
            />
            {dropdownMenu && createPortal(dropdownMenu, document.body)}
        </div>
    );
});
