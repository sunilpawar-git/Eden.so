/** IdeaCard - Unified note/AI card component. Orchestrates editor, keyboard, and UI state via useNodeInput (SSOT) */
/* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-condition */
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useIdeaCardEditor } from '../../hooks/useIdeaCardEditor';
import { useNodeInput, type NodeShortcutMap } from '../../hooks/useNodeInput';
import { useNodeShortcuts } from '../../hooks/useNodeShortcuts';
import { useIdeaCardActions } from '../../hooks/useIdeaCardActions';
import { useIdeaCardState } from '../../hooks/useIdeaCardState';
import { useLinkPreviewRetry } from '../../hooks/useLinkPreviewRetry';
import { useBarPlacement } from '../../hooks/useBarPlacement';
import { useBarPinOpen } from '../../hooks/useBarPinOpen';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { NodeUtilsBar } from './NodeUtilsBar';
import { NodeResizeButtons } from './NodeResizeButtons';
import { NodeHeading, type NodeHeadingHandle } from './NodeHeading';
import { NodeDivider } from './NodeDivider';
import { TagInput } from '@/features/tags';
import {
    EditingContent, GeneratingContent, AICardContent, SimpleCardContent, PlaceholderContent,
} from './IdeaCardContent';
import { CalendarBadge } from '@/features/calendar/components/CalendarBadge';
import { useIdeaCardCalendar } from '@/features/calendar/hooks/useIdeaCardCalendar';
import type { IdeaNodeData } from '../../types/node';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT } from '../../types/node';
import styles from './IdeaCard.module.css';
import handleStyles from './IdeaCardHandles.module.css';

// Proximity threshold for utils bar (CSS variable in px)
const PROXIMITY_THRESHOLD = 80;

export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { heading, prompt = '', output, isGenerating, isPinned, isCollapsed, tags: tagIds = [], linkPreviews, calendarEvent } = data as IdeaNodeData;
    const promptSource = (heading?.trim() ?? prompt) || ''; // Heading is SSOT for prompts; legacy fallback
    const isAICard = Boolean(promptSource && output && promptSource !== output);
    const [showTagInput, setShowTagInput] = useState(false);
    const [isNearEdge, setIsNearEdge] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const cardWrapperRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<NodeHeadingHandle>(null);
    const barPlacement = useBarPlacement(cardWrapperRef, isNearEdge);
    const { isPinnedOpen, handlers: pinOpenHandlers } = useBarPinOpen();

    const { generateFromPrompt } = useNodeGeneration();
    const { getEditableContent, saveContent, placeholder, onSubmitAI } = useIdeaCardState({
        nodeId: id, prompt, output, isAICard, generateFromPrompt,
    });

    const calendar = useIdeaCardCalendar({ nodeId: id, calendarEvent });

    const slashHandler = useCallback((c: string) => {
        if (c === 'ai-generate') useCanvasStore.getState().setInputMode('ai');
    }, []);
    const { editor, getMarkdown, setContent, submitHandlerRef } = useIdeaCardEditor({
        isEditing: useCanvasStore((s) => s.editingNodeId === id),
        output, getEditableContent, placeholder, saveContent,
        onExitEditing: useCallback((): void => { useCanvasStore.getState().stopEditing(); }, []),
    });

    const {
        handleDelete: rawDelete, handleRegenerate, handleConnectClick, handleTransform,
        handleHeadingChange, handleCopy, handleTagsChange, isTransforming,
    } = useIdeaCardActions({ nodeId: id, getEditableContent, contentRef });

    const handleDelete = useCallback(() => { calendar.cleanupOnDelete(); rawDelete(); }, [calendar, rawDelete]);

    useLinkPreviewRetry(id, linkPreviews);

    const handlePinToggle = useCallback(() => { useCanvasStore.getState().toggleNodePinned(id); }, [id]);
    const handleCollapseToggle = useCallback(() => { useCanvasStore.getState().toggleNodeCollapsed(id); }, [id]);
    const handleTagOpen = useCallback(() => { setShowTagInput(true); }, []);

    const focusBody = useCallback(() => { editor?.commands.focus(); }, [editor]);
    const focusHeading = useCallback(() => { headingRef.current?.focus(); }, []);
    // Keyboard shortcuts: t = tags, c = collapse/expand (fires at document level)
    const nodeShortcuts: NodeShortcutMap = useMemo(() => ({
        t: handleTagOpen,
        c: handleCollapseToggle,
    }), [handleTagOpen, handleCollapseToggle]);
    useNodeShortcuts(id, selected ?? false, nodeShortcuts);

    const { isEditing, handleKeyDown, handleDoubleClick } = useNodeInput({
        nodeId: id, editor, getMarkdown, setContent, getEditableContent, saveContent,
        submitHandlerRef, isGenerating: isGenerating ?? false,
        isNewEmptyNode: !prompt && !output, focusHeading,
        shortcuts: nodeShortcuts,
    });

    const hasContent = Boolean(output);
    const onTagsChange = useCallback((ids: string[]) => { handleTagsChange(ids); if (ids.length === 0) setShowTagInput(false); }, [handleTagsChange]);
    const onKeyDownReact = useCallback((e: React.KeyboardEvent) => handleKeyDown(e.nativeEvent), [handleKeyDown]);

    // Proximity-based hover: Show utils bar only when cursor is near edge
    // Resize buttons: Show when hovered anywhere on the node
    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const wrapper = cardWrapperRef.current;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const isLeft = barPlacement === 'left';

        // Calculate distance from relevant edge
        const distanceFromEdge = isLeft
            ? e.clientX - rect.left  // Distance from left edge
            : rect.right - e.clientX; // Distance from right edge

        setIsNearEdge(distanceFromEdge <= PROXIMITY_THRESHOLD);
    }, [barPlacement]);

    const handleMouseLeave = useCallback(() => {
        setIsNearEdge(false);
        setIsHovered(false);
    }, []);

    return (
        <div ref={cardWrapperRef}
            className={`${styles.cardWrapper} ${handleStyles.resizerWrapper} ${isCollapsed ? styles.cardWrapperCollapsed : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onContextMenu={pinOpenHandlers.onContextMenu}
            onTouchStart={pinOpenHandlers.onTouchStart} onTouchEnd={pinOpenHandlers.onTouchEnd}>
            <NodeResizer minWidth={MIN_NODE_WIDTH} maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT} maxHeight={MAX_NODE_HEIGHT} isVisible={selected && !isCollapsed} />
            <NodeResizeButtons nodeId={id} visible={isHovered} />
            <Handle type="target" position={Position.Top} id={`${id}-target`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleTop}`} />
            <div className={`${styles.ideaCard} ${isNearEdge ? styles.ideaCardHovered : ''} ${isCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.headingSection}>
                    <NodeHeading ref={headingRef} heading={heading ?? ''} isEditing={isEditing}
                        onHeadingChange={handleHeadingChange} onEnterKey={focusBody}
                        onDoubleClick={handleDoubleClick} onSlashCommand={slashHandler}
                        onSubmitAI={onSubmitAI} />
                    {calendarEvent && (
                        <CalendarBadge metadata={calendarEvent}
                            onRetry={calendarEvent.status !== 'synced' ? calendar.handleRetry : undefined} />
                    )}
                    {!isCollapsed && <NodeDivider />}
                </div>
                {!isCollapsed && (
                    <div className={`${styles.contentArea} ${isEditing ? styles.editingMode : ''} nowheel`}
                        data-testid="content-area" ref={contentRef} tabIndex={selected || isEditing ? 0 : -1}
                        onKeyDown={selected || isEditing ? onKeyDownReact : undefined}>
                        {isEditing ? <EditingContent editor={editor} /> :
                            isGenerating ? <GeneratingContent /> :
                                hasContent && isAICard && !heading?.trim() ? <AICardContent prompt={prompt} editor={editor} onDoubleClick={handleDoubleClick} linkPreviews={linkPreviews} /> :
                                    hasContent ? <SimpleCardContent editor={editor} onDoubleClick={handleDoubleClick} linkPreviews={linkPreviews} /> :
                                        <PlaceholderContent onDoubleClick={handleDoubleClick} />}
                    </div>
                )}
                {!isCollapsed && (showTagInput || tagIds.length > 0) && (
                    <div className={styles.tagsSection}><TagInput selectedTagIds={tagIds} onChange={onTagsChange} compact /></div>
                )}
            </div>
            <NodeUtilsBar onTagClick={handleTagOpen} onConnectClick={handleConnectClick}
                onCopyClick={handleCopy} onDelete={handleDelete} onTransform={handleTransform}
                onRegenerate={handleRegenerate} onPinToggle={handlePinToggle}
                onCollapseToggle={handleCollapseToggle} hasContent={hasContent}
                isTransforming={isTransforming} isPinned={isPinned ?? false}
                isCollapsed={isCollapsed ?? false} disabled={isGenerating ?? false}
                visible={isNearEdge} isPinnedOpen={isPinnedOpen}
                placement={barPlacement} />
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
