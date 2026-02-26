/** IdeaCard - Unified note/AI card component. Orchestrates editor, keyboard, and UI state via useNodeInput (SSOT) */
import React, { useCallback, useMemo, useState, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useCanvasStore, getNodeMap } from '../../stores/canvasStore';
import { useFocusStore } from '../../stores/focusStore';
import { useIdeaCardEditor } from '../../hooks/useIdeaCardEditor';
import { useNodeInput, type NodeShortcutMap } from '../../hooks/useNodeInput';
import { useNodeShortcuts } from '../../hooks/useNodeShortcuts';
import { useIdeaCardActions } from '../../hooks/useIdeaCardActions';
import { useIdeaCardDuplicateAction } from '../../hooks/useIdeaCardDuplicateAction';
import { useIdeaCardShareAction } from '../../hooks/useIdeaCardShareAction';
import { useIdeaCardState } from '../../hooks/useIdeaCardState';
import { useLinkPreviewRetry } from '../../hooks/useLinkPreviewRetry';
import { useProximityBar } from '../../hooks/useProximityBar';
import { useBarPinOpen } from '../../hooks/useBarPinOpen';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useImageInsert } from '../../hooks/useImageInsert';
import { ensureEditorFocus } from '../../services/imageInsertService';
import { useNodeImageUpload } from '../../hooks/useNodeImageUpload';
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
import type { IdeaNodeData, NodeColorKey } from '../../types/node';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT, normalizeNodeColorKey } from '../../types/node';
import styles from './IdeaCard.module.css';
import handleStyles from './IdeaCardHandles.module.css';
import './NodeImage.module.css';

const COLOR_CLASS: Record<NodeColorKey, string> = {
    default: styles.colorDefault ?? '',
    primary: styles.colorPrimary ?? '',
    success: styles.colorSuccess ?? '',
    warning: styles.colorWarning ?? '',
};

interface ContentAreaProps {
    isEditing: boolean;
    isGenerating: boolean;
    hasContent: boolean;
    isAICard: boolean;
    heading: string | undefined;
    prompt: string;
    editor: Editor | null;
    handleDoubleClick: () => void;
    linkPreviews: IdeaNodeData['linkPreviews'];
}

function renderContentArea(props: ContentAreaProps): React.ReactElement {
    const { isEditing, isGenerating, hasContent, isAICard, heading, prompt, editor, handleDoubleClick, linkPreviews } = props;
    if (isEditing) return <EditingContent editor={editor} />;
    if (isGenerating) return <GeneratingContent />;
    if (hasContent && isAICard && !heading?.trim()) {
        return <AICardContent prompt={prompt} editor={editor} onDoubleClick={handleDoubleClick} linkPreviews={linkPreviews} />;
    }
    if (hasContent) return <SimpleCardContent editor={editor} onDoubleClick={handleDoubleClick} linkPreviews={linkPreviews} />;
    return <PlaceholderContent onDoubleClick={handleDoubleClick} />;
}

export const IdeaCard = React.memo(({ id, data: rfData, selected }: NodeProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nodes may be absent in test mocks
    const storeData = useCanvasStore((s) => s.nodes ? getNodeMap(s.nodes).get(id)?.data : undefined);
    const resolvedData = (storeData ?? rfData) as IdeaNodeData;
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy field, heading is SSOT
    const { heading, prompt = '', output, isGenerating, isPinned, isCollapsed, tags: tagIds = [], linkPreviews, calendarEvent } = resolvedData;
    const nodeColorKey = normalizeNodeColorKey(resolvedData.colorKey);
    const promptSource = (heading?.trim() ?? prompt) || ''; // Heading is SSOT for prompts; legacy fallback
    const isAICard = Boolean(promptSource && output && promptSource !== output);
    const [showTagInput, setShowTagInput] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const cardWrapperRef = useRef<HTMLDivElement>(null);
    const barContainerRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<NodeHeadingHandle>(null);
    useProximityBar(cardWrapperRef, barContainerRef);
    const { isPinnedOpen, handlers: pinOpenHandlers } = useBarPinOpen();

    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { getEditableContent, saveContent, placeholder, onSubmitAI } = useIdeaCardState({
        nodeId: id, prompt, output, isAICard,
        generateFromPrompt, // eslint-disable-line @typescript-eslint/no-misused-promises -- async, consumed by useIdeaCardState
    });

    const calendar = useIdeaCardCalendar({ nodeId: id, calendarEvent });
    const isEditing = useCanvasStore((s) => s.editingNodeId === id);
    const imageUploadFn = useNodeImageUpload(id);

    const { editor, getMarkdown, setContent, submitHandlerRef } = useIdeaCardEditor({
        isEditing,
        output, getEditableContent, placeholder, saveContent,
        onExitEditing: useCallback((): void => { useCanvasStore.getState().stopEditing(); }, []),
        imageUploadFn,
    });

    const handleAfterImageInsert = useCallback(() => {
        const md = getMarkdown();
        if (md) useCanvasStore.getState().updateNodeOutput(id, md);
    }, [id, getMarkdown]);

    const { triggerFilePicker } = useImageInsert(editor, imageUploadFn, handleAfterImageInsert);
    const slashHandler = useCallback((c: string) => {
        if (c === 'ai-generate') useCanvasStore.getState().setInputMode('ai');
        if (c === 'insert-image') triggerFilePicker();
    }, [triggerFilePicker]);
    const handleImageClick = useCallback(() => {
        const store = useCanvasStore.getState();
        if (store.editingNodeId !== id) store.startEditing(id);
        ensureEditorFocus(editor);
        triggerFilePicker();
    }, [id, editor, triggerFilePicker]);

    const {
        handleDelete: rawDelete, handleRegenerate, handleConnectClick, handleTransform,
        handleHeadingChange, handleCopy, handleTagsChange, isTransforming,
    } = useIdeaCardActions({ nodeId: id, getEditableContent, contentRef, generateFromPrompt, branchFromNode });
    const { handleDuplicate } = useIdeaCardDuplicateAction(id);
    const { handleShare, isSharing } = useIdeaCardShareAction(id);

    const handleDelete = useCallback(() => { calendar.cleanupOnDelete(); rawDelete(); }, [calendar, rawDelete]);

    useLinkPreviewRetry(id, linkPreviews);

    const handlePinToggle = useCallback(() => { useCanvasStore.getState().toggleNodePinned(id); }, [id]);
    const handleCollapseToggle = useCallback(() => { useCanvasStore.getState().toggleNodeCollapsed(id); }, [id]);
    const handleColorChange = useCallback((colorKey: NodeColorKey) => {
        useCanvasStore.getState().updateNodeColor(id, colorKey);
    }, [id]);
    const handleTagOpen = useCallback(() => { setShowTagInput(true); }, []);
    const handleFocusClick = useCallback(() => { useFocusStore.getState().enterFocus(id); }, [id]);

    const focusBody = useCallback(() => {
        // Editor may be null before first render
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
        if (editor) editor.commands.focus();
    }, [editor]);
    const focusHeading = useCallback(() => {
        const el = headingRef.current;
        if (el) el.focus();
    }, []);
    const nodeShortcuts: NodeShortcutMap = useMemo(() => ({
        t: handleTagOpen,
        c: handleCollapseToggle,
        f: handleFocusClick,
    }), [handleTagOpen, handleCollapseToggle, handleFocusClick]);
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- selected can be undefined from NodeProps */
    useNodeShortcuts(selected ?? false, nodeShortcuts);

    const { handleKeyDown, handleDoubleClick } = useNodeInput({
        nodeId: id, isEditing, editor, getMarkdown, setContent, getEditableContent, saveContent,
        submitHandlerRef,
        isGenerating: Boolean(isGenerating),
        isNewEmptyNode: !prompt && !output, focusHeading,
        shortcuts: nodeShortcuts,
    });

    const hasContent = Boolean(output);
    const onTagsChange = useCallback((ids: string[]) => { handleTagsChange(ids); if (ids.length === 0) setShowTagInput(false); }, [handleTagsChange]);
    const onKeyDownReact = useCallback((e: React.KeyboardEvent) => handleKeyDown(e.nativeEvent), [handleKeyDown]);

    return (
        <div ref={cardWrapperRef}
            className={`${styles.cardWrapper} ${handleStyles.resizerWrapper} ${isCollapsed ? styles.cardWrapperCollapsed : ''}`}
            onContextMenu={pinOpenHandlers.onContextMenu}
            onTouchStart={pinOpenHandlers.onTouchStart} onTouchEnd={pinOpenHandlers.onTouchEnd}>
            <NodeResizer minWidth={MIN_NODE_WIDTH} maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT} maxHeight={MAX_NODE_HEIGHT} isVisible={selected && !isCollapsed} />
            <NodeResizeButtons nodeId={id} />
            <Handle type="target" position={Position.Top} id={`${id}-target`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleTop}`} />
            <div className={`${styles.ideaCard} ${COLOR_CLASS[nodeColorKey]} ${isCollapsed ? styles.collapsed : ''}`}>
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
                        {renderContentArea({
                            isEditing, isGenerating: isGenerating ?? false,
                            hasContent, isAICard, heading, prompt,
                            editor, handleDoubleClick, linkPreviews,
                        })}
                    </div>
                )}
                {!isCollapsed && (showTagInput || tagIds.length > 0) && (
                    <div className={styles.tagsSection}><TagInput selectedTagIds={tagIds} onChange={onTagsChange} compact /></div>
                )}
            </div>
            <NodeUtilsBar ref={barContainerRef}
                onTagClick={handleTagOpen} onImageClick={handleImageClick}
                onConnectClick={handleConnectClick}
                onCopyClick={handleCopy} onDuplicateClick={handleDuplicate}
                onShareClick={handleShare} isSharing={isSharing}
                onFocusClick={handleFocusClick}
                onDelete={handleDelete} onTransform={handleTransform}
                onRegenerate={handleRegenerate} onPinToggle={handlePinToggle}
                onColorChange={handleColorChange} nodeColorKey={nodeColorKey}
                onCollapseToggle={handleCollapseToggle} hasContent={hasContent}
                isTransforming={isTransforming} isPinned={isPinned ?? false}
                isCollapsed={isCollapsed ?? false} disabled={isGenerating ?? false}
                isPinnedOpen={isPinnedOpen} />
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
