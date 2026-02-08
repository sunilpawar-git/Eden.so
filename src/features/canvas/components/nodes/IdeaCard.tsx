/**
 * IdeaCard - Unified note/AI card component
 * Features: Clean design, optional AI divider, TipTap rich text editor
 */
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useNodeTransformation, type TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { FOCUS_NODE_EVENT, type FocusNodeEvent } from '../../hooks/useQuickCapture';
import { useTipTapEditor } from '../../hooks/useTipTapEditor';
import {
    SlashCommandSuggestion, createSlashSuggestionRender,
} from '../../extensions/slashCommandSuggestion';
import { NodeUtilsBar } from './NodeUtilsBar';
import { NodeResizeButtons } from './NodeResizeButtons';
import { TagInput } from '@/features/tags';
import {
    EditingContent, GeneratingContent, AICardContent, SimpleCardContent, PlaceholderContent,
} from './IdeaCardContent';
import type { IdeaNodeData } from '../../types/node';
import type { InputMode } from '../../types/slashCommand';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT } from '../../types/node';
import styles from './IdeaCard.module.css';
import handleStyles from './IdeaCardHandles.module.css';

// eslint-disable-next-line max-lines-per-function -- primary node component with rich interaction logic
export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { prompt, output, isGenerating, tags: tagIds = [] } = data as IdeaNodeData;
    const isAICard = Boolean(prompt && output && prompt !== output);

    const [isEditing, setIsEditing] = useState(!prompt && !output);
    const [inputMode, setInputMode] = useState<InputMode>('note');
    const [showTagInput, setShowTagInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const getEditableContent = useCallback(() => {
        return isAICard ? prompt : (output ?? '');
    }, [isAICard, prompt, output]);

    const placeholder = inputMode === 'ai'
        ? strings.ideaCard.aiModePlaceholder
        : strings.ideaCard.inputPlaceholder;

    const { deleteNode, updateNodePrompt, updateNodeOutput, updateNodeTags } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { transformNodeContent, isTransforming } = useNodeTransformation();

    const saveContent = useCallback((markdown: string) => {
        const trimmed = markdown.trim();
        const existingContent = getEditableContent();
        if (trimmed && trimmed !== existingContent) {
            if (inputMode === 'ai') {
                updateNodePrompt(id, trimmed);
            } else {
                updateNodeOutput(id, trimmed);
            }
        }
    }, [getEditableContent, id, inputMode, updateNodePrompt, updateNodeOutput]);

    // Track whether slash command popup is active (prevents Enter/blur conflicts)
    const suggestionActiveRef = useRef(false);

    // Configure slash command suggestion extension
    const slashExtensions = useMemo(() => [
        SlashCommandSuggestion.configure({
            suggestion: {
                render: createSlashSuggestionRender({
                    onSelect: (commandId) => {
                        // Guard allows safe extension when new SlashCommandIds are added
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        if (commandId === 'ai-generate') setInputMode('ai');
                    },
                    onActiveChange: (active) => { suggestionActiveRef.current = active; },
                }),
            },
        }),
    ], []);

    const blurHandlerRef = useRef<(markdown: string) => void>((_md: string) => undefined);
    const displayContent = isEditing ? getEditableContent() : (output ?? '');

    const { editor, getMarkdown, setContent } = useTipTapEditor({
        initialContent: displayContent,
        placeholder,
        editable: isEditing,
        onBlur: useCallback((md: string) => blurHandlerRef.current(md), []),
        extraExtensions: slashExtensions,
    });

    const handleEditorBlur = useCallback((markdown: string) => {
        if (suggestionActiveRef.current) return;
        saveContent(markdown);
        setIsEditing(false);
        setInputMode('note');
        setContent(output ?? '');
    }, [saveContent, setContent, output]);

    useEffect(() => { blurHandlerRef.current = handleEditorBlur; }, [handleEditorBlur]);

    // Sync editor content when output changes externally (e.g. AI generation)
    const prevOutputRef = useRef(output);
    useEffect(() => {
        if (output !== prevOutputRef.current && !isEditing) {
            setContent(output ?? '');
            prevOutputRef.current = output;
        }
    }, [output, isEditing, setContent]);

    const handleTransform = useCallback((type: TransformationType) => {
        void transformNodeContent(id, type);
    }, [id, transformNodeContent]);

    // Wheel event passthrough for scrolling
    useEffect(() => {
        const element = contentRef.current;
        if (!element) return;
        const handleWheel = (e: WheelEvent) => e.stopPropagation();
        element.addEventListener('wheel', handleWheel, { passive: false });
        return () => element.removeEventListener('wheel', handleWheel);
    }, []);

    // Listen for quick capture focus events
    useEffect(() => {
        const handleFocusEvent = (e: Event) => {
            const event = e as FocusNodeEvent;
            if (event.detail.nodeId === id) setIsEditing(true);
        };
        window.addEventListener(FOCUS_NODE_EVENT, handleFocusEvent);
        return () => window.removeEventListener(FOCUS_NODE_EVENT, handleFocusEvent);
    }, [id]);

    // Handle keyboard shortcuts within TipTap editor
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!editor || !isEditing) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                saveContent(getMarkdown());
                setIsEditing(false);
                setInputMode('note');
            }
            if (event.key === 'Enter' && !event.shiftKey && !suggestionActiveRef.current) {
                event.preventDefault();
                event.stopPropagation();
                const trimmed = getMarkdown().trim();
                if (!trimmed) {
                    handleEditorBlur('');
                    return;
                }
                if (inputMode === 'ai') {
                    updateNodePrompt(id, trimmed);
                    setIsEditing(false);
                    setInputMode('note');
                    void generateFromPrompt(id);
                } else {
                    updateNodeOutput(id, trimmed);
                    setIsEditing(false);
                    setInputMode('note');
                }
            }
        };
        editor.view.dom.addEventListener('keydown', handleKeyDown);
        return () => editor.view.dom.removeEventListener('keydown', handleKeyDown);
    }, [editor, isEditing, inputMode, id, getMarkdown, saveContent,
        handleEditorBlur, updateNodePrompt, updateNodeOutput, generateFromPrompt]);

    const handleContentDoubleClick = useCallback(() => {
        if (!isGenerating) {
            setContent(getEditableContent());
            setIsEditing(true);
        }
    }, [isGenerating, setContent, getEditableContent]);

    const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (isGenerating) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            setContent(getEditableContent());
            setIsEditing(true);
            return;
        }
        const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isPrintable) {
            setContent(getEditableContent());
            setIsEditing(true);
        }
    }, [isGenerating, setContent, getEditableContent]);

    const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);
    const handleRegenerate = useCallback(() => generateFromPrompt(id), [id, generateFromPrompt]);
    const handleTagClick = useCallback(() => setShowTagInput(true), []);
    const handleConnectClick = useCallback(() => { void branchFromNode(id); }, [id, branchFromNode]);
    const handleTagsChange = useCallback((newTagIds: string[]) => {
        updateNodeTags(id, newTagIds);
        if (newTagIds.length === 0) setShowTagInput(false);
    }, [id, updateNodeTags]);

    const hasContent = Boolean(output);

    const renderContent = () => {
        if (isEditing) return <EditingContent editor={editor} />;
        if (isGenerating) return <GeneratingContent />;
        if (hasContent) {
            if (isAICard) {
                return (
                    <AICardContent prompt={prompt} editor={editor}
                        onDoubleClick={handleContentDoubleClick} onKeyDown={handleContentKeyDown} />
                );
            }
            return (
                <SimpleCardContent editor={editor}
                    onDoubleClick={handleContentDoubleClick} onKeyDown={handleContentKeyDown} />
            );
        }
        return (
            <PlaceholderContent
                onDoubleClick={handleContentDoubleClick} onKeyDown={handleContentKeyDown} />
        );
    };

    return (
        <div
            className={`${styles.cardWrapper} ${handleStyles.resizerWrapper}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <NodeResizer
                minWidth={MIN_NODE_WIDTH} maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT} maxHeight={MAX_NODE_HEIGHT}
                isVisible={selected}
            />
            <NodeResizeButtons nodeId={id} visible={isHovered} />
            <Handle type="target" position={Position.Top} id={`${id}-target`}
                isConnectable={true} className={`${handleStyles.handle} ${handleStyles.handleTop}`} />
            <div className={`${styles.ideaCard} ${isHovered ? styles.ideaCardHovered : ''}`}>
                <div className={`${styles.contentArea} ${isEditing ? styles.editingMode : ''} nowheel`}
                    data-testid="content-area" ref={contentRef} tabIndex={selected ? 0 : -1}
                    onKeyDown={selected ? handleContentKeyDown : undefined}>
                    {renderContent()}
                </div>
                {(showTagInput || tagIds.length > 0) && (
                    <div className={styles.tagsSection}>
                        <TagInput selectedTagIds={tagIds} onChange={handleTagsChange} compact />
                    </div>
                )}
                <NodeUtilsBar
                    onTagClick={handleTagClick}
                    onConnectClick={handleConnectClick}
                    onDelete={handleDelete}
                    onTransform={handleTransform}
                    onRegenerate={handleRegenerate}
                    hasContent={hasContent}
                    isTransforming={isTransforming}
                    disabled={isGenerating ?? false}
                    visible={isHovered}
                    hasTags={tagIds.length > 0 || showTagInput}
                />
            </div>
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable={true} className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
