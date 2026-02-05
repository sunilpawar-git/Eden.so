/**
 * IdeaCard - Unified note/AI card component
 * Features: Clean design, optional AI divider, unified actions
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useNodeTransformation, type TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { FOCUS_NODE_EVENT, type FocusNodeEvent } from '../../hooks/useQuickCapture';
import { IdeaCardActionBar } from './IdeaCardActionBar';
import { TagInput } from '@/features/tags';
import type { IdeaNodeData } from '../../types/node';
import {
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH,
    MIN_NODE_HEIGHT,
    MAX_NODE_HEIGHT,
} from '../../types/node';
import styles from './IdeaCard.module.css';

export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { prompt, output, isGenerating, tags: tagIds = [] } = data as IdeaNodeData;
    
    // AI card: has both prompt AND output that differ
    const isAICard = Boolean(prompt && output && prompt !== output);
    
    // Edit mode: start in edit if no content
    const [isEditing, setIsEditing] = useState(!prompt && !output);
    const [localInput, setLocalInput] = useState('');
    
    const { deleteNode, updateNodePrompt, updateNodeOutput, updateNodeTags } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { transformNodeContent, isTransforming } = useNodeTransformation();

    // Handle transformation from menu
    const handleTransform = useCallback((type: TransformationType) => {
        void transformNodeContent(id, type);
    }, [id, transformNodeContent]);

    // Ref for content section to attach native wheel listener
    const contentRef = useRef<HTMLDivElement>(null);

    // Handle wheel events to prevent ReactFlow zoom
    useEffect(() => {
        const element = contentRef.current;
        if (!element) return;

        const handleWheel = (e: WheelEvent) => {
            e.stopPropagation();
        };

        element.addEventListener('wheel', handleWheel, { passive: false });
        return () => element.removeEventListener('wheel', handleWheel);
    }, []);

    // Get the content that should be edited (prompt for AI cards, output for notes)
    const getEditableContent = useCallback(() => {
        return isAICard ? prompt : (output ?? '');
    }, [isAICard, prompt, output]);

    // Populate localInput when entering edit mode
    useEffect(() => {
        if (isEditing) {
            setLocalInput(getEditableContent());
        }
    }, [isEditing, getEditableContent]);

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

    // Save content on blur (prevents data loss)
    const handleInputBlur = useCallback(() => {
        const trimmed = localInput.trim();
        const existingContent = getEditableContent();
        
        // Only save if content has changed and is not empty
        if (trimmed && trimmed !== existingContent) {
            const AI_PREFIX = strings.ideaCard.aiPrefix;
            
            if (trimmed.startsWith(AI_PREFIX)) {
                // AI Mode: Save prompt (but don't trigger generation on blur)
                const actualPrompt = trimmed.slice(AI_PREFIX.length).trim();
                if (actualPrompt) {
                    updateNodePrompt(id, actualPrompt);
                }
            } else {
                // Note Mode: Save to output
                updateNodeOutput(id, trimmed);
            }
        }
        
        setIsEditing(false);
        setLocalInput('');
    }, [localInput, getEditableContent, id, updateNodePrompt, updateNodeOutput]);

    const handleInputKeyDown = useCallback(
        async (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const trimmed = localInput.trim();
                
                if (!trimmed) {
                    handleInputBlur();
                    return;
                }
                
                const AI_PREFIX = strings.ideaCard.aiPrefix;
                
                if (trimmed.startsWith(AI_PREFIX)) {
                    // AI Mode: Extract prompt after /ai: prefix
                    const actualPrompt = trimmed.slice(AI_PREFIX.length).trim();
                    
                    if (!actualPrompt) {
                        handleInputBlur();
                        return;
                    }
                    
                    updateNodePrompt(id, actualPrompt);
                    setLocalInput('');
                    setIsEditing(false);
                    await generateFromPrompt(id);
                } else {
                    // Note Mode: Save to output only
                    updateNodeOutput(id, trimmed);
                    setLocalInput('');
                    setIsEditing(false);
                }
            }
            if (e.key === 'Escape') {
                setIsEditing(false);
                setLocalInput('');
            }
        },
        [handleInputBlur, localInput, generateFromPrompt, id, updateNodePrompt, updateNodeOutput]
    );

    // Double-click to enter edit mode (single-click allows node selection)
    const handleContentDoubleClick = useCallback(() => {
        if (!isGenerating) {
            setIsEditing(true);
        }
    }, [isGenerating]);

    // Keyboard support: Enter on content enters edit mode
    const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isGenerating) {
            e.preventDefault();
            setIsEditing(true);
        }
    }, [isGenerating]);

    const handleDelete = useCallback(() => {
        deleteNode(id);
    }, [id, deleteNode]);

    const handleBranch = useCallback(() => {
        branchFromNode(id);
    }, [id, branchFromNode]);

    const handleRegenerate = useCallback(() => {
        generateFromPrompt(id);
    }, [id, generateFromPrompt]);

    const handleTagsChange = useCallback((newTagIds: string[]) => {
        updateNodeTags(id, newTagIds);
    }, [id, updateNodeTags]);

    // Determine what content to show
    const hasContent = Boolean(output);

    return (
        <div className={styles.cardWrapper}>
            <NodeResizer 
                minWidth={MIN_NODE_WIDTH}
                maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT}
                maxHeight={MAX_NODE_HEIGHT}
                isVisible={selected}
            />
            <Handle
                type="target"
                position={Position.Top}
                id={`${id}-target`}
                isConnectable={true}
                className={`${styles.handle} ${styles.handleTop}`}
            />
            <div className={styles.ideaCard}>
                {/* Content Area - supports Enter key when node is selected */}
                <div 
                    className={`${styles.contentArea} nowheel`} 
                    data-testid="content-area"
                    ref={contentRef}
                    tabIndex={selected ? 0 : -1}
                    onKeyDown={selected ? handleContentKeyDown : undefined}
                >
                    {isEditing ? (
                        <textarea
                            className={styles.inputArea}
                            value={localInput}
                            onChange={(e) => setLocalInput(e.target.value)}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                            placeholder={strings.ideaCard.inputPlaceholder}
                            autoFocus
                            disabled={isGenerating}
                        />
                    ) : isGenerating ? (
                        <div className={styles.generating}>
                            <div className={styles.spinner} />
                            <span>{strings.canvas.generating}</span>
                        </div>
                    ) : hasContent ? (
                        <>
                            {/* AI Card: Show prompt + divider + output */}
                            {isAICard && (
                                <>
                                    <div 
                                        className={styles.promptText}
                                        onDoubleClick={handleContentDoubleClick}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={handleContentKeyDown}
                                    >
                                        {prompt}
                                    </div>
                                    <div 
                                        className={styles.divider} 
                                        data-testid="ai-divider"
                                        aria-label={strings.ideaCard.aiDividerLabel}
                                    />
                                </>
                            )}
                            {/* Output (both note and AI cards) */}
                            <div
                                onDoubleClick={!isAICard ? handleContentDoubleClick : undefined}
                                role={!isAICard ? 'button' : undefined}
                                tabIndex={!isAICard ? 0 : undefined}
                                onKeyDown={!isAICard ? handleContentKeyDown : undefined}
                            >
                                <MarkdownRenderer 
                                    content={output!} 
                                    className={styles.outputContent}
                                />
                            </div>
                        </>
                    ) : (
                        <div 
                            className={styles.placeholder}
                            onDoubleClick={handleContentDoubleClick}
                            role="button"
                            tabIndex={0}
                            onKeyDown={handleContentKeyDown}
                        >
                            {strings.ideaCard.inputPlaceholder}
                        </div>
                    )}
                </div>

                {/* Tags Section */}
                <div className={styles.tagsSection}>
                    <TagInput selectedTagIds={tagIds} onChange={handleTagsChange} compact />
                </div>

                <IdeaCardActionBar
                    hasContent={hasContent}
                    isGenerating={isGenerating ?? false}
                    isTransforming={isTransforming}
                    onTransform={handleTransform}
                    onRegenerate={handleRegenerate}
                    onBranch={handleBranch}
                    onDelete={handleDelete}
                />
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                id={`${id}-source`}
                isConnectable={true}
                className={`${styles.handle} ${styles.handleBottom}`}
            />
        </div>
    );
});
