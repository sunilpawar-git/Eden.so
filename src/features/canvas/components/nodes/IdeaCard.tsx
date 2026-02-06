/**
 * IdeaCard - Unified note/AI card component
 * Features: Clean design, optional AI divider, slash command menu
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useNodeTransformation, type TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { FOCUS_NODE_EVENT, type FocusNodeEvent } from '../../hooks/useQuickCapture';
import { useSlashCommandInput } from '../../hooks/useSlashCommandInput';
import { NodeUtilsBar } from './NodeUtilsBar';
import { SlashCommandMenu } from './SlashCommandMenu';
import { TagInput } from '@/features/tags';
import type { IdeaNodeData } from '../../types/node';
import {
    MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT,
} from '../../types/node';
import styles from './IdeaCard.module.css';
import handleStyles from './IdeaCardHandles.module.css';

export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { prompt, output, isGenerating, tags: tagIds = [] } = data as IdeaNodeData;
    const isAICard = Boolean(prompt && output && prompt !== output);

    const [isEditing, setIsEditing] = useState(!prompt && !output);
    const [showTagInput, setShowTagInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [textareaRect, setTextareaRect] = useState<DOMRect | null>(null);
    const wasEditingRef = useRef(false);

    // Slash command hook for "/" menu
    const {
        inputMode, isMenuOpen, query, inputValue,
        handleInputChange, handleCommandSelect, closeMenu, reset
    } = useSlashCommandInput();

    const { deleteNode, updateNodePrompt, updateNodeOutput, updateNodeTags } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { transformNodeContent, isTransforming } = useNodeTransformation();

    const handleTransform = useCallback((type: TransformationType) => {
        void transformNodeContent(id, type);
    }, [id, transformNodeContent]);

    const contentRef = useRef<HTMLDivElement>(null);

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

    // Populate input when ENTERING edit mode (not on every render)
    useEffect(() => {
        if (isEditing && !wasEditingRef.current) {
            handleInputChange(getEditableContent());
        }
        wasEditingRef.current = isEditing;
    }, [isEditing, getEditableContent, handleInputChange]);

    // Update textarea rect when editing starts
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            setTextareaRect(textareaRef.current.getBoundingClientRect());
        }
    }, [isEditing, isMenuOpen]);

    // Listen for quick capture focus events
    useEffect(() => {
        const handleFocusEvent = (e: Event) => {
            const event = e as FocusNodeEvent;
            if (event.detail.nodeId === id) {
                setIsEditing(true);
            }
        };
        window.addEventListener(FOCUS_NODE_EVENT, handleFocusEvent);
        return () => window.removeEventListener(FOCUS_NODE_EVENT, handleFocusEvent);
    }, [id]);

    const handleInputBlur = useCallback(() => {
        if (isMenuOpen) return;

        const trimmed = inputValue.trim();
        const existingContent = getEditableContent();

        if (trimmed && trimmed !== existingContent) {
            if (inputMode === 'ai') {
                updateNodePrompt(id, trimmed);
            } else {
                updateNodeOutput(id, trimmed);
            }
        }

        setIsEditing(false);
        reset();
    }, [isMenuOpen, inputValue, inputMode, getEditableContent, id, updateNodePrompt, updateNodeOutput, reset]);

    const handleInputKeyDown = useCallback(
        async (e: React.KeyboardEvent) => {
            // Handle Escape - save content and exit (same behavior as blur)
            if (e.key === 'Escape') {
                e.stopPropagation(); // Prevent global keyboard handler
                if (isMenuOpen) {
                    // Close menu, clear the "/" and stay in edit mode
                    closeMenu();
                    handleInputChange('');
                } else {
                    // Save current content before exiting (prevents text vanishing)
                    const trimmed = inputValue.trim();
                    const existingContent = getEditableContent();
                    if (trimmed && trimmed !== existingContent) {
                        if (inputMode === 'ai') {
                            updateNodePrompt(id, trimmed);
                        } else {
                            updateNodeOutput(id, trimmed);
                        }
                    }
                    setIsEditing(false);
                    reset();
                }
                return;
            }

            // Don't handle other keys if menu is open (menu handles them)
            if (isMenuOpen) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation(); // Prevent global keyboard handler
                const trimmed = inputValue.trim();

                if (!trimmed) {
                    handleInputBlur();
                    return;
                }

                if (inputMode === 'ai') {
                    updateNodePrompt(id, trimmed);
                    setIsEditing(false); // Exit first
                    reset();             // Then clear local state
                    await generateFromPrompt(id);
                } else {
                    updateNodeOutput(id, trimmed);
                    setIsEditing(false); // Exit first
                    reset();             // Then clear local state
                }
            }
        },
        [handleInputBlur, inputValue, inputMode, isMenuOpen, generateFromPrompt, id,
            updateNodePrompt, updateNodeOutput, reset, closeMenu, handleInputChange, getEditableContent]
    );

    const handleContentDoubleClick = useCallback(() => {
        if (!isGenerating) setIsEditing(true);
    }, [isGenerating]);

    const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (isGenerating) return;

        // Enter key - explicit edit mode trigger
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsEditing(true);
            return;
        }

        // Printable character - instant type-to-edit (Google Keep style)
        // Single printable character key (length 1), not a modifier combo
        const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isPrintable) {
            setIsEditing(true);
            // Note: The typed character will need to be handled after textarea mounts
        }
    }, [isGenerating]);

    const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);
    const handleRegenerate = useCallback(() => generateFromPrompt(id), [id, generateFromPrompt]);
    const handleTagClick = useCallback(() => setShowTagInput(true), []);
    const handleConnectClick = useCallback(() => {
        void branchFromNode(id);
    }, [id, branchFromNode]);
    const handleTagsChange = useCallback((newTagIds: string[]) => {
        updateNodeTags(id, newTagIds);
        if (newTagIds.length === 0) setShowTagInput(false);
    }, [id, updateNodeTags]);

    const hasContent = Boolean(output);
    const placeholder = inputMode === 'ai'
        ? strings.ideaCard.aiModePlaceholder
        : strings.ideaCard.inputPlaceholder;

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
                <div className={`${styles.contentArea} ${isEditing ? styles.editingMode : ''} nowheel`} data-testid="content-area"
                    ref={contentRef} tabIndex={selected ? 0 : -1}
                    onKeyDown={selected ? handleContentKeyDown : undefined}>
                    {isEditing ? (
                        <div className={styles.inputWrapper}>
                            {inputMode === 'ai' && (
                                <div className={styles.aiIndicator} data-testid="ai-mode-indicator">
                                    ✨ {strings.ideaCard.aiModeIndicator}
                                </div>
                            )}
                            <textarea
                                ref={textareaRef}
                                className={styles.inputArea}
                                value={inputValue}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onBlur={handleInputBlur}
                                onKeyDown={handleInputKeyDown}
                                placeholder={placeholder}
                                autoFocus
                                disabled={isGenerating}
                            />
                            {isMenuOpen && textareaRect && (
                                <SlashCommandMenu
                                    query={query}
                                    onSelect={handleCommandSelect}
                                    onClose={closeMenu}
                                    anchorRect={textareaRect}
                                />
                            )}
                        </div>
                    ) : isGenerating ? (
                        <div className={styles.generating}>
                            <div className={styles.spinner} />
                            <span>{strings.canvas.generating}</span>
                        </div>
                    ) : hasContent ? (
                        <>
                            {isAICard && (
                                <>
                                    <div className={styles.promptText}
                                        onDoubleClick={handleContentDoubleClick}
                                        role="button" tabIndex={0} onKeyDown={handleContentKeyDown}>
                                        {prompt}
                                    </div>
                                    <div className={styles.divider} data-testid="ai-divider"
                                        aria-label={strings.ideaCard.aiDividerLabel} />
                                </>
                            )}
                            <div onDoubleClick={!isAICard ? handleContentDoubleClick : undefined}
                                role={!isAICard ? 'button' : undefined}
                                tabIndex={!isAICard ? 0 : undefined}
                                onKeyDown={!isAICard ? handleContentKeyDown : undefined}>
                                <MarkdownRenderer content={output!} className={styles.outputContent} />
                            </div>
                        </>
                    ) : (
                        <div className={styles.placeholder} onDoubleClick={handleContentDoubleClick}
                            role="button" tabIndex={0} onKeyDown={handleContentKeyDown}>
                            {strings.ideaCard.inputPlaceholder}
                        </div>
                    )}
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
