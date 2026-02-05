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
import type { IdeaNodeData } from '../../types/node';
import styles from './IdeaCard.module.css';

export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { prompt, output, isGenerating } = data as IdeaNodeData;
    
    // AI card: has both prompt AND output that differ
    const isAICard = Boolean(prompt && output && prompt !== output);
    
    // Edit mode: start in edit if no content
    const [isEditing, setIsEditing] = useState(!prompt && !output);
    const [localInput, setLocalInput] = useState('');
    
    const { deleteNode, updateNodePrompt, updateNodeOutput } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();

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

    // Determine what content to show
    const hasContent = Boolean(output);

    return (
        <div className={styles.cardWrapper}>
            <NodeResizer 
                minWidth={280} 
                maxWidth={600} 
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

                {/* Unified Action Bar - ALL cards get same actions */}
                <div className={styles.actionBar}>
                    <button
                        className={styles.actionButton}
                        onClick={handleRegenerate}
                        disabled={(isGenerating ?? false) || !hasContent}
                        aria-label={strings.ideaCard.regenerate}
                        data-tooltip={strings.ideaCard.regenerate}
                    >
                        <span className={styles.icon}>↻</span>
                    </button>
                    <button
                        className={styles.actionButton}
                        onClick={handleBranch}
                        disabled={!hasContent}
                        aria-label={strings.ideaCard.branch}
                        data-tooltip={strings.ideaCard.branch}
                    >
                        <span className={styles.icon}>⑂</span>
                    </button>
                    <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={handleDelete}
                        aria-label={strings.ideaCard.delete}
                        data-tooltip={strings.ideaCard.delete}
                    >
                        <span className={styles.icon}>🗑</span>
                    </button>
                </div>
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
