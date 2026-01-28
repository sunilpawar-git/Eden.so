/**
 * IdeaCard - Unified prompt + output node component
 * Features: Editable header, scrollable output, resizable
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { MarkdownRenderer } from '@/shared/components/MarkdownRenderer';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import type { IdeaNodeData } from '../../types/node';
import styles from './IdeaCard.module.css';

export const IdeaCard = React.memo(function IdeaCard({ id, data, selected }: NodeProps) {
    const { prompt, output, isGenerating } = data as IdeaNodeData;
    
    const [isEditingPrompt, setIsEditingPrompt] = useState(!prompt);
    const [localPrompt, setLocalPrompt] = useState(prompt);
    
    const { deleteNode, updateNodePrompt } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();

    const handlePromptBlur = useCallback(() => {
        setIsEditingPrompt(false);
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

    const handleDelete = useCallback(() => {
        deleteNode(id);
    }, [id, deleteNode]);

    const handleBranch = useCallback(() => {
        branchFromNode(id);
    }, [id, branchFromNode]);

    const handleHeaderClick = useCallback(() => {
        if (!isGenerating) {
            setIsEditingPrompt(true);
        }
    }, [isGenerating]);

    // Ref for output section to attach native wheel listener
    const outputRef = useRef<HTMLDivElement>(null);

    // Use native event listener to intercept wheel events before ReactFlow
    // Combined with 'nowheel' class for maximum compatibility
    useEffect(() => {
        const outputElement = outputRef.current;
        if (!outputElement) return;

        const handleWheel = (e: WheelEvent) => {
            // Stop event from bubbling to ReactFlow's zoom handler
            e.stopPropagation();
        };

        // passive: false allows stopPropagation to work
        outputElement.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            outputElement.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // Display text for header
    const headerText = prompt || strings.canvas.promptPlaceholder;

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
                {/* Editable Header Bar */}
                <div className={styles.promptHeader}>
                    {isEditingPrompt ? (
                        <textarea
                            className={styles.headerInput}
                            value={localPrompt}
                            onChange={(e) => setLocalPrompt(e.target.value)}
                            onBlur={handlePromptBlur}
                            onKeyDown={handlePromptKeyDown}
                            placeholder={strings.canvas.promptPlaceholder}
                            autoFocus
                            disabled={isGenerating}
                        />
                    ) : (
                        <span 
                            className={styles.headerTitle}
                            onClick={handleHeaderClick}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleHeaderClick()}
                        >
                            {headerText}
                        </span>
                    )}
                </div>

                {/* Output Section - nowheel class prevents ReactFlow zoom on scroll */}
                <div 
                    className={`${styles.outputSection} nowheel`} 
                    data-testid="output-section"
                    ref={outputRef}
                >
                    {isGenerating ? (
                        <div className={styles.generating}>
                            <div className={styles.spinner} />
                            <span>{strings.canvas.generating}</span>
                        </div>
                    ) : output ? (
                        <MarkdownRenderer 
                            content={output} 
                            className={styles.outputContent}
                        />
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
                                data-tooltip={strings.ideaCard.regenerate}
                            >
                                <span className={styles.icon}>↻</span>
                            </button>
                            <button
                                className={styles.actionButton}
                                onClick={handleBranch}
                                aria-label={strings.ideaCard.branch}
                                data-tooltip={strings.ideaCard.branch}
                            >
                                <span className={styles.icon}>⑂</span>
                            </button>
                        </>
                    )}
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
