/**
 * IdeaCard - Unified prompt + output node component
 * Features: Collapsible prompt, scrollable output, resizable
 */
import React, { useCallback, useState } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import type { IdeaNodeData } from '../../types/node';
import styles from './IdeaCard.module.css';

export const IdeaCard = React.memo(function IdeaCard({ id, data }: NodeProps) {
    const { prompt, output, isGenerating, isPromptCollapsed } = data as IdeaNodeData;
    
    const [isEditingPrompt, setIsEditingPrompt] = useState(!prompt);
    const [localPrompt, setLocalPrompt] = useState(prompt);
    
    const { togglePromptCollapsed, deleteNode, updateNodePrompt } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();

    const handlePromptBlur = useCallback(() => {
        setIsEditingPrompt(false);
        // Update prompt field in IdeaNode data
        updateNodePrompt(id, localPrompt);
    }, [id, localPrompt, updateNodePrompt]);

    const handlePromptKeyDown = useCallback(
        async (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePromptBlur();
                if (localPrompt.trim()) {
                    await generateFromPrompt(id);
                }
            }
            if (e.key === 'Escape') {
                setIsEditingPrompt(false);
                setLocalPrompt(prompt);
            }
        },
        [handlePromptBlur, localPrompt, generateFromPrompt, id, prompt]
    );

    const handleCollapseToggle = useCallback(() => {
        togglePromptCollapsed(id);
    }, [id, togglePromptCollapsed]);

    const handleDelete = useCallback(() => {
        deleteNode(id);
    }, [id, deleteNode]);

    const handleBranch = useCallback(() => {
        branchFromNode(id);
    }, [id, branchFromNode]);

    const handlePromptClick = useCallback(() => {
        if (!isGenerating) {
            setIsEditingPrompt(true);
        }
    }, [isGenerating]);

    return (
        <>
            <NodeResizer minWidth={280} maxWidth={600} />
            <div className={styles.ideaCard}>
                <Handle
                    type="target"
                    position={Position.Top}
                    id={`${id}-target`}
                    isConnectable={true}
                    className={styles.handle}
                />

                {/* Prompt Section */}
                <div className={styles.promptSection}>
                    <div className={styles.promptHeader}>
                        <button
                            className={styles.collapseButton}
                            onClick={handleCollapseToggle}
                            aria-label={isPromptCollapsed ? strings.ideaCard.expandPrompt : strings.ideaCard.collapsePrompt}
                        >
                            {isPromptCollapsed ? '▶' : '▼'}
                        </button>
                    </div>
                    
                    {isPromptCollapsed ? (
                        <div className={styles.promptCollapsed}>
                            {prompt || strings.canvas.promptPlaceholder}
                        </div>
                    ) : isEditingPrompt ? (
                        <textarea
                            className={styles.promptInput}
                            value={localPrompt}
                            onChange={(e) => setLocalPrompt(e.target.value)}
                            onBlur={handlePromptBlur}
                            onKeyDown={handlePromptKeyDown}
                            placeholder={strings.canvas.promptPlaceholder}
                            autoFocus
                            disabled={isGenerating}
                        />
                    ) : (
                        <div
                            className={styles.promptContent}
                            onClick={handlePromptClick}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handlePromptClick()}
                        >
                            {prompt || strings.canvas.promptPlaceholder}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className={styles.divider} />

                {/* Output Section */}
                <div className={styles.outputSection} data-testid="output-section">
                    {isGenerating ? (
                        <div className={styles.generating}>
                            <div className={styles.spinner} />
                            <span>{strings.canvas.generating}</span>
                        </div>
                    ) : output ? (
                        <div className={styles.outputContent}>
                            {output}
                        </div>
                    ) : (
                        <div className={styles.outputPlaceholder}>
                            {strings.ideaCard.noOutput}
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className={styles.actionBar}>
                    {output && (
                        <>
                            <button
                                className={styles.actionButton}
                                onClick={() => generateFromPrompt(id)}
                                disabled={isGenerating}
                                aria-label={strings.ideaCard.regenerate}
                            >
                                ↻ {strings.ideaCard.regenerate}
                            </button>
                            <button
                                className={styles.actionButton}
                                onClick={handleBranch}
                                aria-label={strings.ideaCard.branch}
                            >
                                ⑂ {strings.ideaCard.branch}
                            </button>
                        </>
                    )}
                    <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={handleDelete}
                        aria-label={strings.ideaCard.delete}
                    >
                        🗑 {strings.ideaCard.delete}
                    </button>
                </div>

                <Handle
                    type="source"
                    position={Position.Bottom}
                    id={`${id}-source`}
                    isConnectable={true}
                    className={styles.handle}
                />
            </div>
        </>
    );
});
