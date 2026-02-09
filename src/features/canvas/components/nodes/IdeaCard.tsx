/**
 * IdeaCard - Unified note/AI card component
 * Orchestrates editor, keyboard, and UI state via useNodeInput (SSOT)
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useNodeTransformation, type TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { FOCUS_NODE_EVENT, type FocusNodeEvent } from '../../hooks/useQuickCapture';
import { useIdeaCardEditor } from '../../hooks/useIdeaCardEditor';
import { useNodeInput } from '../../hooks/useNodeInput';
import { NodeUtilsBar } from './NodeUtilsBar';
import { NodeResizeButtons } from './NodeResizeButtons';
import { TagInput } from '@/features/tags';
import {
    EditingContent, GeneratingContent, AICardContent, SimpleCardContent, PlaceholderContent,
} from './IdeaCardContent';
import type { IdeaNodeData } from '../../types/node';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT } from '../../types/node';
import styles from './IdeaCard.module.css';
import handleStyles from './IdeaCardHandles.module.css';

export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { prompt, output, isGenerating, tags: tagIds = [] } = data as IdeaNodeData;
    const isAICard = Boolean(prompt && output && prompt !== output);
    const [showTagInput, setShowTagInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const { deleteNode, updateNodePrompt, updateNodeOutput, updateNodeTags } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { transformNodeContent, isTransforming } = useNodeTransformation();

    const getEditableContent = useCallback(() => isAICard ? prompt : (output ?? ''), [isAICard, prompt, output]);
    const inputMode = useCanvasStore((s) => s.inputMode);
    const placeholder = inputMode === 'ai' ? strings.ideaCard.aiModePlaceholder : strings.ideaCard.inputPlaceholder;
    const saveContent = useCallback((md: string) => {
        const t = md.trim();
        const currentMode = useCanvasStore.getState().inputMode;
        if (t && t !== getEditableContent()) {
            if (currentMode === 'ai') updateNodePrompt(id, t); else updateNodeOutput(id, t);
        }
    }, [getEditableContent, id, updateNodePrompt, updateNodeOutput]);
    const onExitEditing = useCallback(() => { useCanvasStore.getState().stopEditing(); }, []);

    const { editor, getMarkdown, setContent, suggestionActiveRef } = useIdeaCardEditor({
        isEditing: useCanvasStore((s) => s.editingNodeId === id),
        output, getEditableContent, placeholder, saveContent, onExitEditing,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        onSlashCommand: useCallback((c: string) => { if (c === 'ai-generate') useCanvasStore.getState().setInputMode('ai'); }, []),
    });

    const { isEditing, handleKeyDown, handleDoubleClick } = useNodeInput({
        nodeId: id, editor, getMarkdown, setContent, getEditableContent,
        saveContent, suggestionActiveRef, isGenerating: isGenerating ?? false,
        onSubmitNote: useCallback((t: string) => { updateNodeOutput(id, t); useCanvasStore.getState().stopEditing(); }, [id, updateNodeOutput]),
        onSubmitAI: useCallback((t: string) => {
            updateNodePrompt(id, t); useCanvasStore.getState().stopEditing(); void generateFromPrompt(id);
        }, [id, updateNodePrompt, generateFromPrompt]),
    });

    const handleTransform = useCallback((type: TransformationType) => { void transformNodeContent(id, type); }, [id, transformNodeContent]);

    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const h = (e: WheelEvent) => e.stopPropagation();
        el.addEventListener('wheel', h, { passive: false });
        return () => el.removeEventListener('wheel', h);
    }, []);

    useEffect(() => {
        const h = (e: Event) => {
            if ((e as FocusNodeEvent).detail.nodeId === id) useCanvasStore.getState().startEditing(id);
        };
        window.addEventListener(FOCUS_NODE_EVENT, h);
        return () => window.removeEventListener(FOCUS_NODE_EVENT, h);
    }, [id]);

    // Auto-enter edit mode for empty new cards (synchronous via ref guard)
    const autoEditRef = useRef(!prompt && !output);
    if (autoEditRef.current) {
        autoEditRef.current = false;
        if (!useCanvasStore.getState().editingNodeId) {
            useCanvasStore.getState().startEditing(id);
        }
    }

    const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);
    const handleRegenerate = useCallback(() => generateFromPrompt(id), [id, generateFromPrompt]);
    const handleConnectClick = useCallback(() => { void branchFromNode(id); }, [id, branchFromNode]);
    const handleTagsChange = useCallback((ids: string[]) => {
        updateNodeTags(id, ids); if (ids.length === 0) setShowTagInput(false);
    }, [id, updateNodeTags]);
    const hasContent = Boolean(output);
    const onKeyDownReact = useCallback(
        (e: React.KeyboardEvent) => handleKeyDown(e.nativeEvent),
        [handleKeyDown],
    );

    return (
        <div className={`${styles.cardWrapper} ${handleStyles.resizerWrapper}`}
            onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <NodeResizer minWidth={MIN_NODE_WIDTH} maxWidth={MAX_NODE_WIDTH}
                minHeight={MIN_NODE_HEIGHT} maxHeight={MAX_NODE_HEIGHT} isVisible={selected} />
            <NodeResizeButtons nodeId={id} visible={isHovered} />
            <Handle type="target" position={Position.Top} id={`${id}-target`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleTop}`} />
            <div className={`${styles.ideaCard} ${isHovered ? styles.ideaCardHovered : ''}`}>
                <div className={`${styles.contentArea} ${isEditing ? styles.editingMode : ''} nowheel`}
                    data-testid="content-area" ref={contentRef} tabIndex={selected ? 0 : -1}
                    onKeyDown={selected ? onKeyDownReact : undefined}>
                    {isEditing ? <EditingContent editor={editor} /> :
                     isGenerating ? <GeneratingContent /> :
                     hasContent && isAICard ? <AICardContent prompt={prompt} editor={editor} onDoubleClick={handleDoubleClick} /> :
                     hasContent ? <SimpleCardContent editor={editor} onDoubleClick={handleDoubleClick} /> :
                     <PlaceholderContent onDoubleClick={handleDoubleClick} />}
                </div>
                {(showTagInput || tagIds.length > 0) && (
                    <div className={styles.tagsSection}><TagInput selectedTagIds={tagIds} onChange={handleTagsChange} compact /></div>
                )}
                <NodeUtilsBar onTagClick={() => setShowTagInput(true)} onConnectClick={handleConnectClick}
                    onDelete={handleDelete} onTransform={handleTransform} onRegenerate={handleRegenerate}
                    hasContent={hasContent} isTransforming={isTransforming}
                    disabled={isGenerating ?? false} visible={isHovered} hasTags={tagIds.length > 0 || showTagInput} />
            </div>
            <Handle type="source" position={Position.Bottom} id={`${id}-source`}
                isConnectable className={`${handleStyles.handle} ${handleStyles.handleBottom}`} />
        </div>
    );
});
