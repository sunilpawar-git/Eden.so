/**
 * IdeaCard - Unified note/AI card component
 * Features: Clean design, optional AI divider, slash command menu
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useNodeTransformation, type TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { FOCUS_NODE_EVENT, type FocusNodeEvent } from '../../hooks/useQuickCapture';
import { useSlashCommandInput } from '../../hooks/useSlashCommandInput';
import { NodeUtilsBar } from './NodeUtilsBar';
import { TagInput } from '@/features/tags';
import {
    EditingContent,
    GeneratingContent,
    AICardContent,
    SimpleCardContent,
    PlaceholderContent,
} from './IdeaCardContent';
import type { IdeaNodeData } from '../../types/node';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT } from '../../types/node';
import styles from './IdeaCard.module.css';
import handleStyles from './IdeaCardHandles.module.css';

// eslint-disable-next-line max-lines-per-function -- primary node component with rich interaction logic
export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { prompt, output, isGenerating, tags: tagIds = [] } = data as IdeaNodeData;
    const isAICard = Boolean(prompt && output && prompt !== output);

    const [isEditing, setIsEditing] = useState(!prompt && !output);
    const [showTagInput, setShowTagInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wasEditingRef = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const {
        inputMode, isMenuOpen, query, inputValue, activeCommand,
        handleInputChange, handleCommandSelect, handleDeactivateCommand, closeMenu, reset
    } = useSlashCommandInput();

    const { deleteNode, updateNodePrompt, updateNodeOutput, updateNodeTags } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { transformNodeContent, isTransforming } = useNodeTransformation();

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

    const getEditableContent = useCallback(() => {
        return isAICard ? prompt : (output ?? '');
    }, [isAICard, prompt, output]);

    // Populate input when ENTERING edit mode
    useEffect(() => {
        if (isEditing && !wasEditingRef.current) {
            handleInputChange(getEditableContent());
        }
        wasEditingRef.current = isEditing;
    }, [isEditing, getEditableContent, handleInputChange]);

    // Listen for quick capture focus events
    useEffect(() => {
        const handleFocusEvent = (e: Event) => {
            const event = e as FocusNodeEvent;
            if (event.detail.nodeId === id) setIsEditing(true);
        };
        window.addEventListener(FOCUS_NODE_EVENT, handleFocusEvent);
        return () => window.removeEventListener(FOCUS_NODE_EVENT, handleFocusEvent);
    }, [id]);

    const saveContent = useCallback((value: string) => {
        const trimmed = value.trim();
        const existingContent = getEditableContent();
        if (trimmed && trimmed !== existingContent) {
            if (inputMode === 'ai') {
                updateNodePrompt(id, trimmed);
            } else {
                updateNodeOutput(id, trimmed);
            }
        }
    }, [getEditableContent, id, inputMode, updateNodePrompt, updateNodeOutput]);

    const handleInputBlur = useCallback(() => {
        if (isMenuOpen) return;
        saveContent(inputValue);
        setIsEditing(false);
        reset();
    }, [isMenuOpen, inputValue, saveContent, reset]);

    const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            if (isMenuOpen) {
                closeMenu();
                handleInputChange('');
            } else if (activeCommand) {
                // First Escape: deactivate command (back to note mode)
                handleDeactivateCommand();
            } else {
                saveContent(inputValue);
                setIsEditing(false);
                reset();
            }
            return;
        }

        if (isMenuOpen) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            const trimmed = inputValue.trim();
            if (!trimmed) {
                handleInputBlur();
                return;
            }
            if (inputMode === 'ai') {
                updateNodePrompt(id, trimmed);
                setIsEditing(false);
                reset();
                await generateFromPrompt(id);
            } else {
                updateNodeOutput(id, trimmed);
                setIsEditing(false);
                reset();
            }
        }
    }, [handleInputBlur, inputValue, inputMode, isMenuOpen, activeCommand, generateFromPrompt, id,
        updateNodePrompt, updateNodeOutput, reset, closeMenu, handleInputChange,
        handleDeactivateCommand, saveContent]);

    const handleContentDoubleClick = useCallback(() => {
        if (!isGenerating) setIsEditing(true);
    }, [isGenerating]);

    const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (isGenerating) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsEditing(true);
            return;
        }
        const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isPrintable) setIsEditing(true);
    }, [isGenerating]);

    const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);
    const handleRegenerate = useCallback(() => generateFromPrompt(id), [id, generateFromPrompt]);
    const handleTagClick = useCallback(() => setShowTagInput(true), []);
    const handleConnectClick = useCallback(() => { void branchFromNode(id); }, [id, branchFromNode]);
    const handleTagsChange = useCallback((newTagIds: string[]) => {
        updateNodeTags(id, newTagIds);
        if (newTagIds.length === 0) setShowTagInput(false);
    }, [id, updateNodeTags]);

    const hasContent = Boolean(output);
    const placeholder = inputMode === 'ai'
        ? strings.ideaCard.aiModePlaceholder
        : strings.ideaCard.inputPlaceholder;

    const renderContent = () => {
        if (isEditing) {
            return (
                <EditingContent
                    inputMode={inputMode}
                    inputValue={inputValue}
                    placeholder={placeholder}
                    isMenuOpen={isMenuOpen}
                    isGenerating={isGenerating ?? false}
                    query={query}
                    textareaRef={textareaRef}
                    onInputChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    onCommandSelect={handleCommandSelect}
                    onMenuClose={closeMenu}
                />
            );
        }

        if (isGenerating) {
            return <GeneratingContent />;
        }

        if (hasContent) {
            if (isAICard) {
                return (
                    <AICardContent
                        prompt={prompt}
                        output={output ?? ''}
                        onDoubleClick={handleContentDoubleClick}
                        onKeyDown={handleContentKeyDown}
                    />
                );
            }
            return (
                <SimpleCardContent
                    output={output ?? ''}
                    onDoubleClick={handleContentDoubleClick}
                    onKeyDown={handleContentKeyDown}
                />
            );
        }

        return (
            <PlaceholderContent
                onDoubleClick={handleContentDoubleClick}
                onKeyDown={handleContentKeyDown}
            />
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
                    visible={isHovered && !isMenuOpen}
                    hasTags={tagIds.length > 0 || showTagInput}
                />
            </div>
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable={true} className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
