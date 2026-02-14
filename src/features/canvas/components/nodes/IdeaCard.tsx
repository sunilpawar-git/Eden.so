/** IdeaCard - Unified note/AI card component. Orchestrates editor, keyboard, and UI state via useNodeInput (SSOT) */
/* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-condition */
import React, { useCallback, useState, useRef } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useIdeaCardEditor } from '../../hooks/useIdeaCardEditor';
import { useNodeInput } from '../../hooks/useNodeInput';
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
import type { IdeaNodeData } from '../../types/node';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT } from '../../types/node';
import styles from './IdeaCard.module.css';
import handleStyles from './IdeaCardHandles.module.css';

export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { heading, prompt = '', output, isGenerating, isPinned, isCollapsed, tags: tagIds = [], linkPreviews } = data as IdeaNodeData;
    const promptSource = (heading?.trim() ?? prompt) || ''; // Heading is SSOT for prompts; legacy fallback
    const isAICard = Boolean(promptSource && output && promptSource !== output);
    const [showTagInput, setShowTagInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const cardWrapperRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<NodeHeadingHandle>(null);
    const barPlacement = useBarPlacement(cardWrapperRef);
    const { isPinnedOpen, handlers: pinOpenHandlers } = useBarPinOpen();

    const { generateFromPrompt } = useNodeGeneration();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const { getEditableContent, saveContent, placeholder, onSubmitAI } = useIdeaCardState({
        nodeId: id, prompt, output, isAICard, generateFromPrompt,
    });

    const slashHandler = useCallback((c: string) => {
        if (c === 'ai-generate') useCanvasStore.getState().setInputMode('ai');
    }, []);
    const { editor, getMarkdown, setContent, submitHandlerRef } = useIdeaCardEditor({
        isEditing: useCanvasStore((s) => s.editingNodeId === id),
        output, getEditableContent, placeholder, saveContent,
        onExitEditing: useCallback((): void => { useCanvasStore.getState().stopEditing(); }, []),
    });
    const focusBody = useCallback(() => { editor?.commands.focus(); }, [editor]);
    const focusHeading = useCallback(() => { headingRef.current?.focus(); }, []);
    const { isEditing, handleKeyDown, handleDoubleClick } = useNodeInput({
        nodeId: id, editor, getMarkdown, setContent, getEditableContent, saveContent,
        submitHandlerRef, isGenerating: isGenerating ?? false,
        isNewEmptyNode: !prompt && !output, focusHeading,
    });

    const {
        handleDelete, handleRegenerate, handleConnectClick, handleTransform,
        handleHeadingChange, handleCopy, handleTagsChange, isTransforming,
    } = useIdeaCardActions({ nodeId: id, getEditableContent, contentRef });

    useLinkPreviewRetry(id, linkPreviews);

    const handlePinToggle = useCallback(() => { useCanvasStore.getState().toggleNodePinned(id); }, [id]);
    const handleCollapseToggle = useCallback(() => { useCanvasStore.getState().toggleNodeCollapsed(id); }, [id]);

    const hasContent = Boolean(output);
    const onTagsChange = useCallback((ids: string[]) => { handleTagsChange(ids); if (ids.length === 0) setShowTagInput(false); }, [handleTagsChange]);
    const onKeyDownReact = useCallback((e: React.KeyboardEvent) => handleKeyDown(e.nativeEvent), [handleKeyDown]);

    return (
        <div ref={cardWrapperRef} className={`${styles.cardWrapper} ${handleStyles.resizerWrapper}`}
            onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => { setIsHovered(false); if (!isPinnedOpen) return; }}
            onContextMenu={pinOpenHandlers.onContextMenu}
            onTouchStart={pinOpenHandlers.onTouchStart} onTouchEnd={pinOpenHandlers.onTouchEnd}>
            <NodeResizer minWidth={MIN_NODE_WIDTH} maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT} maxHeight={MAX_NODE_HEIGHT} isVisible={selected} />
            <NodeResizeButtons nodeId={id} visible={isHovered} />
            <Handle type="target" position={Position.Top} id={`${id}-target`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleTop}`} />
            <div className={`${styles.ideaCard} ${isHovered ? styles.ideaCardHovered : ''} ${isCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.headingSection}>
                    <NodeHeading ref={headingRef} heading={heading ?? ''} isEditing={isEditing}
                        onHeadingChange={handleHeadingChange} onEnterKey={focusBody}
                        onDoubleClick={handleDoubleClick} onSlashCommand={slashHandler}
                        onSubmitAI={onSubmitAI} />
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
            <NodeUtilsBar onTagClick={() => setShowTagInput(true)} onConnectClick={handleConnectClick}
                onCopyClick={handleCopy} onDelete={handleDelete} onTransform={handleTransform}
                onRegenerate={handleRegenerate} onPinToggle={handlePinToggle}
                onCollapseToggle={handleCollapseToggle} hasContent={hasContent}
                isTransforming={isTransforming} isPinned={isPinned ?? false}
                isCollapsed={isCollapsed ?? false} disabled={isGenerating ?? false}
                visible={isHovered} isPinnedOpen={isPinnedOpen}
                placement={barPlacement} />
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
