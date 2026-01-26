/**
 * AI Output Node - Generated content display (memoized for performance)
 */
import React, { useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../../stores/canvasStore';
import { SynthesisIndicator } from '@/features/ai/components/SynthesisIndicator';
import styles from './AIOutputNode.module.css';

export const AIOutputNode = React.memo(function AIOutputNode({
    id,
    data,
}: NodeProps) {
    const content = (data.content as string) ?? '';
    const isGenerating = (data.isGenerating as boolean) ?? false;
    const [isEditing, setIsEditing] = useState(false);
    const [localContent, setLocalContent] = useState(content);
    const { updateNodeContent, deleteNode } = useCanvasStore();

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        updateNodeContent(id, localContent);
    }, [id, localContent, updateNodeContent]);

    const handleDelete = useCallback(() => {
        deleteNode(id);
    }, [id, deleteNode]);

    if (isGenerating) {
        return (
            <div className={styles.aiNode}>
                <Handle type="target" position={Position.Top} />
                <div className={styles.generating}>
                    <div className={styles.spinner} />
                    <span>{strings.canvas.generating}</span>
                </div>
                <Handle type="source" position={Position.Bottom} />
            </div>
        );
    }

    return (
        <div className={styles.aiNode}>
            <Handle type="target" position={Position.Top} className={styles.handle} />

            <div className={styles.header}>
                <span className={styles.tag}>{strings.canvas.generatedBy}</span>
                <div className={styles.actions}>
                    <button
                        className={styles.actionButton}
                        onClick={() => setIsEditing(true)}
                        title={strings.canvas.edit}
                    >
                        ✏️
                    </button>
                    <button
                        className={styles.actionButton}
                        onClick={handleDelete}
                        title={strings.canvas.delete}
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {isEditing ? (
                <textarea
                    className={styles.input}
                    value={localContent}
                    onChange={(e) => setLocalContent(e.target.value)}
                    onBlur={handleBlur}
                    autoFocus
                />
            ) : (
                <div className={styles.content}>{content}</div>
            )}

            <Handle type="source" position={Position.Bottom} className={styles.handle} />
            <SynthesisIndicator nodeId={id} />
        </div>
    );
});
