/**
 * Prompt Node - User input node with AI generation trigger (memoized)
 */
import React, { useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAIStore } from '@/features/ai/stores/aiStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { SynthesisIndicator } from '@/features/ai/components/SynthesisIndicator';
import styles from './PromptNode.module.css';

export const PromptNode = React.memo(function PromptNode({
    id,
    data,
}: NodeProps) {
    const content = (data.content as string) ?? '';
    const [isEditing, setIsEditing] = useState(!content);
    const [localContent, setLocalContent] = useState(content);
    const updateNodeContent = useCanvasStore((s) => s.updateNodeContent);
    const { isGenerating, generatingNodeId } = useAIStore();
    const { generateFromPrompt } = useNodeGeneration();

    const isThisNodeGenerating = isGenerating && generatingNodeId === id;

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        updateNodeContent(id, localContent);
    }, [id, localContent, updateNodeContent]);

    const handleKeyDown = useCallback(
        async (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleBlur();
                // Trigger AI generation
                if (localContent.trim()) {
                    await generateFromPrompt(id);
                }
            }
            if (e.key === 'Escape') {
                setIsEditing(false);
                setLocalContent(content);
            }
        },
        [handleBlur, content, localContent, generateFromPrompt, id]
    );

    return (
        <div className={styles.promptNode}>
            <Handle
                type="target"
                position={Position.Top}
                id={`${id}-target`}
                isConnectable={true}
                className={styles.handle}
            />

            {isEditing ? (
                <textarea
                    className={styles.input}
                    value={localContent}
                    onChange={(e) => setLocalContent(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={strings.canvas.promptPlaceholder}
                    autoFocus
                    disabled={isThisNodeGenerating}
                />
            ) : (
                <div
                    className={`${styles.content} ${isThisNodeGenerating ? styles.generating : ''}`}
                    onClick={() => !isThisNodeGenerating && setIsEditing(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !isThisNodeGenerating && setIsEditing(true)}
                >
                    {isThisNodeGenerating ? (
                        <span className={styles.generatingText}>
                            <span className={styles.spinner} />
                            {strings.canvas.generating}
                        </span>
                    ) : (
                        content || strings.canvas.promptPlaceholder
                    )}
                </div>
            )}

            <Handle
                type="source"
                position={Position.Bottom}
                id={`${id}-source`}
                isConnectable={true}
                className={styles.handle}
            />
            <SynthesisIndicator nodeId={id} />
        </div>
    );
});
