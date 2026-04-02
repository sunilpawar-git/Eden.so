/**
 * IdeaCardActionsSection — Renders the HoverMenu + ContextMenu overlay for IdeaCard.
 * Extracted to keep IdeaCard under max-lines-per-function and complexity thresholds.
 */
import React from 'react';
import { NodeHoverMenu } from './NodeHoverMenu';
import { IdeaCardContextMenuSection } from './IdeaCardContextMenuSection';
import { isContentModeMindmap, type ContentMode } from '../../types/contentMode';
import type { NodeColorKey } from '../../types/node';
import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';

interface IdeaCardActionsSectionProps {
    readonly nodeId: string;
    readonly barContainerRef: React.RefObject<HTMLDivElement>;
    readonly registerProximityLostFn?: (fn: () => void) => void;
    readonly hasContent: boolean;
    readonly isGenerating: boolean;
    readonly isTransforming: boolean;
    readonly isPinned: boolean;
    readonly isCollapsed: boolean;
    readonly isInPool: boolean;
    readonly contentMode: ContentMode | undefined;
    readonly nodeColorKey: NodeColorKey;
    readonly isSharing: boolean;
    readonly handleConnectClick: () => void;
    readonly handleCopy: () => void;
    readonly handleDelete: () => void;
    readonly handleTransform: (type: TransformationType) => void;
    readonly handleRegenerate: () => void;
    readonly handleMoreClick: () => void;
    readonly handleDoubleClick: () => void;
    readonly handlePinToggle: () => void;
    readonly handleDuplicate: () => void;
    readonly handleCollapseToggle: () => void;
    readonly handleFocusClick: () => void;
    readonly handleTagOpen: () => void;
    readonly handleImageClick: () => void;
    readonly handleAttachmentClick: () => void;
    readonly handlePoolToggle: () => void;
    readonly handleContentModeToggle: () => void;
    readonly handleColorChange: (colorKey: NodeColorKey) => void;
    readonly handleShare: (targetWorkspaceId: string) => Promise<void>;
    readonly contextMenu: {
        readonly isOpen: boolean;
        readonly position: { x: number; y: number } | null;
        readonly close: () => void;
    };
}

export function IdeaCardActionsSection(props: IdeaCardActionsSectionProps) {
    const isMindmap = isContentModeMindmap(props.contentMode);

    return (
        <>
            <NodeHoverMenu ref={props.barContainerRef} registerProximityLostFn={props.registerProximityLostFn}
                onConnectClick={props.handleConnectClick} onCopyClick={props.handleCopy}
                onDelete={props.handleDelete} onTransform={props.handleTransform} onRegenerate={props.handleRegenerate}
                hasContent={props.hasContent} isTransforming={props.isTransforming} disabled={props.isGenerating}
                onMoreClick={props.handleMoreClick} onAIClick={props.handleDoubleClick}
                onPinToggle={props.handlePinToggle} onDuplicateClick={props.handleDuplicate}
                onCollapseToggle={props.handleCollapseToggle} onFocusClick={props.handleFocusClick}
                onTagClick={props.handleTagOpen} onImageClick={props.handleImageClick}
                onAttachmentClick={props.handleAttachmentClick} onPoolToggle={props.handlePoolToggle}
                onContentModeToggle={props.handleContentModeToggle}
                isPinned={props.isPinned} isCollapsed={props.isCollapsed}
                isInPool={props.isInPool} isMindmapMode={isMindmap} />
            {props.contextMenu.isOpen && props.contextMenu.position && (
                <IdeaCardContextMenuSection nodeId={props.nodeId}
                    position={props.contextMenu.position} onClose={props.contextMenu.close}
                    onTagClick={props.handleTagOpen} onImageClick={props.handleImageClick}
                    onAttachmentClick={props.handleAttachmentClick}
                    onFocusClick={props.handleFocusClick} onDuplicateClick={props.handleDuplicate}
                    onShareClick={props.handleShare} isSharing={props.isSharing}
                    onPinToggle={props.handlePinToggle} onCollapseToggle={props.handleCollapseToggle}
                    onPoolToggle={props.handlePoolToggle} onColorChange={props.handleColorChange}
                    nodeColorKey={props.nodeColorKey}
                    isPinned={props.isPinned} isCollapsed={props.isCollapsed}
                    isInPool={props.isInPool} onContentModeToggle={props.handleContentModeToggle}
                    isMindmapMode={isMindmap}
                    onDeleteClick={props.handleDelete} onCopyClick={props.handleCopy}
                    onConnectClick={props.handleConnectClick} onAIClick={props.handleDoubleClick}
                    hasContent={props.hasContent} />
            )}
        </>
    );
}
