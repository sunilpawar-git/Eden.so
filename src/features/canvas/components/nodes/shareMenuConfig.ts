/**
 * ShareMenu configuration — shared types and helpers for workspace sharing.
 */
import type { PortalTooltipProps } from '@/shared/components/PortalTooltip';

export interface ShareMenuProps {
    onShare: (targetWorkspaceId: string) => Promise<void>;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    isSharing?: boolean;
    disabled?: boolean;
    tooltipPlacement?: PortalTooltipProps['placement'];
}
