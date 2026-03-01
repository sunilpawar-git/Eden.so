import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import type { NodeColorKey } from '../../types/node';

export interface NodeUtilsBarProps {
    onTagClick: () => void;
    onImageClick?: () => void;
    onAIClick?: () => void;
    onConnectClick: () => void;
    onCopyClick?: () => void;
    onDuplicateClick?: () => void;
    onShareClick?: (targetWorkspaceId: string) => Promise<void>;
    isSharing?: boolean;
    onColorChange?: (colorKey: NodeColorKey) => void;
    nodeColorKey?: NodeColorKey;
    onFocusClick?: () => void;
    onDelete: () => void;
    onTransform?: (type: TransformationType) => void;
    onRegenerate?: () => void;
    onPinToggle?: () => void;
    onCollapseToggle?: () => void;
    hasContent?: boolean;
    isTransforming?: boolean;
    isPinned?: boolean;
    isCollapsed?: boolean;
    disabled?: boolean;
    /** Bar stays visible regardless of hover (right-click/long-press pin) */
    isPinnedOpen?: boolean;
    /** Called once on mount with the handleProximityLost callback, so the card wrapper can trigger it on mouse leave. */
    registerProximityLostFn?: (fn: () => void) => void;
}
