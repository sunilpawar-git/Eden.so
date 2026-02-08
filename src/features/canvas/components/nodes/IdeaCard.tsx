/**
 * IdeaCard - Unified note/AI card component
 * Orchestrates editor, keyboard, and UI state via extracted hooks
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useNodeTransformation, type TransformationType } from '@/features/ai/hooks/useNodeTransformation';
import { FOCUS_NODE_EVENT, type FocusNodeEvent } from '../../hooks/useQuickCapture';
import { useIdeaCardEditor } from '../../hooks/useIdeaCardEditor';
import { useIdeaCardKeyboard } from '../../hooks/useIdeaCardKeyboard';
import { NodeUtilsBar } from './NodeUtilsBar';
import { NodeResizeButtons } from './NodeResizeButtons';
import { TagInput } from '@/features/tags';
import {
    EditingContent, GeneratingContent, AICardContent, SimpleCardContent, PlaceholderContent,
} from './IdeaCardContent';
import type { IdeaNodeData } from '../../types/node';
import type { InputMode } from '../../types/slashCommand';
import { MIN_NODE_WIDTH, MAX_NODE_WIDTH, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT } from '../../types/node';
import styles from './IdeaCard.module.css';
import handleStyles from './IdeaCardHandles.module.css';

export const IdeaCard = React.memo(({ id, data, selected }: NodeProps) => {
    const { prompt, output, isGenerating, tags: tagIds = [] } = data as IdeaNodeData;
    const isAICard = Boolean(prompt && output && prompt !== output);
    const [isEditing, setIsEditing] = useState(!prompt && !output);
    const [inputMode, setInputMode] = useState<InputMode>('note');
    const [showTagInput, setShowTagInput] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const { deleteNode, updateNodePrompt, updateNodeOutput, updateNodeTags } = useCanvasStore();
    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { transformNodeContent, isTransforming } = useNodeTransformation();

    const getEditableContent = useCallback(() => isAICard ? prompt : (output ?? ''), [isAICard, prompt, output]);
    const placeholder = inputMode === 'ai' ? strings.ideaCard.aiModePlaceholder : strings.ideaCard.inputPlaceholder;
    const saveContent = useCallback((md: string) => {
        const t = md.trim();
        if (t && t !== getEditableContent()) {
            if (inputMode === 'ai') updateNodePrompt(id, t); else updateNodeOutput(id, t);
        }
    }, [getEditableContent, id, inputMode, updateNodePrompt, updateNodeOutput]);
    const onExitEditing = useCallback(() => { setIsEditing(false); setInputMode('note'); }, []);

    const { editor, getMarkdown, setContent, suggestionActiveRef } = useIdeaCardEditor({
        isEditing, output, getEditableContent, placeholder, saveContent, onExitEditing,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        onSlashCommand: useCallback((c: string) => { if (c === 'ai-generate') setInputMode('ai'); }, []),
    });

    const onEnterEditing = useCallback(() => setIsEditing(true), []);
    const { handleContentDoubleClick, handleContentKeyDown } = useIdeaCardKeyboard({
        editor, isEditing, isGenerating: isGenerating ?? false, inputMode,
        getMarkdown, setContent, getEditableContent,
        suggestionActiveRef, saveContent, onExitEditing, onEnterEditing,
        onSubmitNote: useCallback((t: string) => { updateNodeOutput(id, t); onExitEditing(); }, [id, updateNodeOutput, onExitEditing]),
        onSubmitAI: useCallback((t: string) => {
            updateNodePrompt(id, t); onExitEditing(); void generateFromPrompt(id);
        }, [id, updateNodePrompt, onExitEditing, generateFromPrompt]),
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
        const h = (e: Event) => { if ((e as FocusNodeEvent).detail.nodeId === id) setIsEditing(true); };
        window.addEventListener(FOCUS_NODE_EVENT, h);
        return () => window.removeEventListener(FOCUS_NODE_EVENT, h);
    }, [id]);

    const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);
    const handleRegenerate = useCallback(() => generateFromPrompt(id), [id, generateFromPrompt]);
    const handleConnectClick = useCallback(() => { void branchFromNode(id); }, [id, branchFromNode]);
    const handleTagsChange = useCallback((ids: string[]) => {
        updateNodeTags(id, ids); if (ids.length === 0) setShowTagInput(false);
    }, [id, updateNodeTags]);
    const hasContent = Boolean(output);
    const dc = handleContentDoubleClick;
    const kd = handleContentKeyDown;

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
                    onKeyDown={selected ? kd : undefined}>
                    {isEditing ? <EditingContent editor={editor} /> :
                     isGenerating ? <GeneratingContent /> :
                     hasContent && isAICard ? <AICardContent prompt={prompt} editor={editor} onDoubleClick={dc} onKeyDown={kd} /> :
                     hasContent ? <SimpleCardContent editor={editor} onDoubleClick={dc} onKeyDown={kd} /> :
                     <PlaceholderContent onDoubleClick={dc} onKeyDown={kd} />}
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
