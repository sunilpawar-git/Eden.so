/**
 * ShareMenu — Controlled portal dropdown for cross-workspace node sharing.
 * Open/close is owned by parent controller.
 * Hover state uses useCssHover to avoid cascading re-renders.
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { PortalTooltip } from '@/shared/components/PortalTooltip';
import { strings } from '@/shared/localization/strings';
import { NODE_UTILS_PORTAL_ATTR } from '../../hooks/useNodeUtilsController';
import { useCssHover } from '../../hooks/useCssHover';
import { getDropdownPosition } from './dropdownPositioning';
import type { ShareMenuProps } from './shareMenuConfig';
import styles from './ShareMenu.module.css';

export const ShareMenu = React.memo(function ShareMenu({
    onShare, isOpen, onToggle, onClose,
    isSharing = false, disabled = false, tooltipPlacement,
}: ShareMenuProps) {
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isHovered = useCssHover(buttonRef);

    const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
    const workspaces = useWorkspaceStore((s) => s.workspaces);

    const otherWorkspaces = useMemo(
        () => workspaces.filter((ws) => ws.id !== currentWorkspaceId && ws.type !== 'divider'),
        [workspaces, currentWorkspaceId],
    );

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            setMenuPosition(getDropdownPosition(buttonRef.current));
        }
    }, [isOpen]);

    const handleToggle = useCallback(() => {
        if (!disabled && !isSharing) onToggle();
    }, [disabled, isSharing, onToggle]);

    const handleSelect = useCallback((workspaceId: string) => {
        if (isSharing) return;
        onClose();
        void onShare(workspaceId);
    }, [onShare, isSharing, onClose]);

    const dropdownMenu = isOpen ? (
        <div className={`${styles.dropdownMenu} ${isSharing ? styles.sharing : ''}`}
            role="menu" aria-busy={isSharing}
            aria-label={strings.nodeUtils.shareToWorkspace}
            data-testid="share-menu-portal"
            {...{ [NODE_UTILS_PORTAL_ATTR]: 'true' }}
            style={{ top: menuPosition.top, left: menuPosition.left }}>
            {otherWorkspaces.length === 0 ? (
                <div className={styles.emptyMessage}>{strings.nodeUtils.noOtherWorkspaces}</div>
            ) : otherWorkspaces.map((ws) => (
                <button key={ws.id} className={styles.menuItem}
                    onClick={() => handleSelect(ws.id)} role="menuitem" disabled={isSharing}>
                    {ws.name}
                </button>
            ))}
        </div>
    ) : null;

    return (
        <div className={styles.shareMenuWrapper}>
            <button ref={buttonRef} className={styles.shareButton}
                onClick={handleToggle} disabled={disabled || isSharing}
                aria-label={strings.nodeUtils.share} aria-expanded={isOpen} aria-haspopup="menu">
                <span className={styles.icon}>📤</span>
            </button>
            <PortalTooltip text={strings.nodeUtils.share} targetRef={buttonRef}
                visible={isHovered && !isOpen && !disabled && !isSharing}
                placement={tooltipPlacement} />
            {dropdownMenu && createPortal(dropdownMenu, document.body)}
        </div>
    );
});
