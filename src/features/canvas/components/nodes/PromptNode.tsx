/**
 * Prompt Node - User input node (memoized for performance)
 */
import React, { useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../../stores/canvasStore';
import styles from './PromptNode.module.css';

export const PromptNode = React.memo(function PromptNode({
    id,
    data,
}: NodeProps) {
    const content = (data.content as string) ?? '';
    const [isEditing, setIsEditing] = useState(!content);
    const [localContent, setLocalContent] = useState(content);
    const updateNodeContent = useCanvasStore((s) => s.updateNodeContent);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        updateNodeContent(id, localContent);
    }, [id, localContent, updateNodeContent]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleBlur();
                // TODO: Trigger AI generation in Phase 3
            }
            if (e.key === 'Escape') {
                setIsEditing(false);
                setLocalContent(content);
            }
        },
        [handleBlur, content]
    );

    return (
        <div className={styles.promptNode}>
            <Handle type="target" position={Position.Top} className={styles.handle} />

            {isEditing ? (
                <textarea
                    className={styles.input}
                    value={localContent}
                    onChange={(e) => setLocalContent(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={strings.canvas.promptPlaceholder}
                    autoFocus
                />
            ) : (
                <div
                    className={styles.content}
                    onClick={() => setIsEditing(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
                >
                    {content || strings.canvas.promptPlaceholder}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className={styles.handle} />
        </div>
    );
});
