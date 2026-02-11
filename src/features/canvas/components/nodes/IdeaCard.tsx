/** IdeaCard - Unified note/AI card component. Orchestrates editor, keyboard, and UI state via useNodeInput (SSOT) */
/* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-condition */
import React, { useCallback, useState, useRef } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useIdeaCardEditor } from '../../hooks/useIdeaCardEditor';
import { useNodeInput } from '../../hooks/useNodeInput';
import { useIdeaCardActions } from '../../hooks/useIdeaCardActions';
import { useIdeaCardState } from '../../hooks/useIdeaCardState';
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
    const { heading, prompt = '', output, isGenerating, tags: tagIds = [], linkPreviews } = data as IdeaNodeData;
    const promptSource = (heading?.trim() ?? prompt) || ''; // Heading is SSOT for prompts; legacy fallback
    const isAICard = Boolean(promptSource && output && promptSource !== output);
    const [showTagInput, setShowTagInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<NodeHeadingHandle>(null);

    const { generateFromPrompt } = useNodeGeneration();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const { getEditableContent, saveContent, placeholder, onSubmitNote, onSubmitAI } = useIdeaCardState({
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
        isNewEmptyNode: !prompt && !output, onSubmitNote, focusHeading,
    });

    const {
        handleDelete, handleRegenerate, handleConnectClick, handleTransform,
        handleHeadingChange, handleCopy, handleTagsChange, isTransforming,
    } = useIdeaCardActions({ nodeId: id, getEditableContent, contentRef });

    const hasContent = Boolean(output);
    const onTagsChange = useCallback((ids: string[]) => { handleTagsChange(ids); if (ids.length === 0) setShowTagInput(false); }, [handleTagsChange]);
    const onKeyDownReact = useCallback((e: React.KeyboardEvent) => handleKeyDown(e.nativeEvent), [handleKeyDown]);

    return (
        <div className={`${styles.cardWrapper} ${handleStyles.resizerWrapper}`}
            onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <NodeResizer minWidth={MIN_NODE_WIDTH} maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT} maxHeight={MAX_NODE_HEIGHT} isVisible={selected} />
            <NodeResizeButtons nodeId={id} visible={isHovered} />
            <Handle type="target" position={Position.Top} id={`${id}-target`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleTop}`} />
            <div className={`${styles.ideaCard} ${isHovered ? styles.ideaCardHovered : ''}`}>
                <div className={styles.headingSection}>
                    <NodeHeading ref={headingRef} heading={heading ?? ''} isEditing={isEditing}
                        onHeadingChange={handleHeadingChange} onEnterKey={focusBody}
                        onDoubleClick={handleDoubleClick} onSlashCommand={slashHandler}
                        onSubmitAI={onSubmitAI} />
                    <NodeDivider />
                </div>
                <div className={`${styles.contentArea} ${isEditing ? styles.editingMode : ''} nowheel`}
                    data-testid="content-area" ref={contentRef} tabIndex={selected || isEditing ? 0 : -1}
                    onKeyDown={selected || isEditing ? onKeyDownReact : undefined}>
                    {isEditing ? <EditingContent editor={editor} /> :
                     isGenerating ? <GeneratingContent /> :
                     hasContent && isAICard && !heading?.trim() ? <AICardContent prompt={prompt} editor={editor} onDoubleClick={handleDoubleClick} linkPreviews={linkPreviews} /> :
                     hasContent ? <SimpleCardContent editor={editor} onDoubleClick={handleDoubleClick} linkPreviews={linkPreviews} /> :
                     <PlaceholderContent onDoubleClick={handleDoubleClick} />}
                </div>
                {(showTagInput || tagIds.length > 0) && (
                    <div className={styles.tagsSection}><TagInput selectedTagIds={tagIds} onChange={onTagsChange} compact /></div>
                )}
                <NodeUtilsBar onTagClick={() => setShowTagInput(true)} onConnectClick={handleConnectClick}
                    onCopyClick={handleCopy} onDelete={handleDelete} onTransform={handleTransform}
                    onRegenerate={handleRegenerate} hasContent={hasContent} isTransforming={isTransforming}
                    disabled={isGenerating ?? false} visible={isHovered} hasResizeButtons={isHovered} />
            </div>
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
