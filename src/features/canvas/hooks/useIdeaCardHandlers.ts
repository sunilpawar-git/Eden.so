import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useFocusStore } from '../stores/focusStore';
import { useIdeaCardActions } from './useIdeaCardActions';
import { useIdeaCardDuplicateAction } from './useIdeaCardDuplicateAction';
import { useIdeaCardShareAction } from './useIdeaCardShareAction';
import { useIdeaCardImageHandlers } from './useIdeaCardImageHandlers';
import { useNodeInput, type NodeShortcutMap } from './useNodeInput';
import { useNodeShortcuts } from './useNodeShortcuts';
import type { IdeaNodeData, NodeColorKey } from '../types/node';
import type { NodeHeadingHandle } from '../components/nodes/NodeHeading';
import type { SubmitKeymapHandler } from '../extensions/submitKeymap';
import type { Editor } from '@tiptap/react';

interface UseIdeaCardHandlersParams {
    id: string;
    selected: boolean | undefined;
    setShowTagInput: (v: boolean) => void;
    contentRef: React.RefObject<HTMLDivElement | null>;
    headingRef: React.RefObject<NodeHeadingHandle | null>;
    editor: Editor | null;
    getMarkdown: () => string;
    setContent: (md: string) => void;
    getEditableContent: () => string;
    saveContent: (md: string) => void;
    submitHandlerRef: React.MutableRefObject<SubmitKeymapHandler | null>;
    imageUploadFn: (file: File) => Promise<string>;
    generateFromPrompt: (nodeId: string) => void | Promise<void>;
    branchFromNode: (nodeId: string) => string | undefined;
    calendar: { cleanupOnDelete: () => void; handleRetry: () => void };
    resolvedData: IdeaNodeData;
    isEditing: boolean;
    onSubmitAI: (prompt: string) => void;
}

export function useIdeaCardHandlers(params: UseIdeaCardHandlersParams) {
    const { id, selected, setShowTagInput, contentRef, headingRef, editor, getMarkdown, setContent,
        getEditableContent, saveContent, submitHandlerRef, imageUploadFn,
        generateFromPrompt, branchFromNode, calendar, resolvedData, isEditing, onSubmitAI } = params;
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy field, heading is SSOT
    const { prompt = '', output, isGenerating } = resolvedData;

    const { slashHandler, handleImageClick } = useIdeaCardImageHandlers({ id, editor, getMarkdown, imageUploadFn });

    const { handleDelete: rawDelete, handleRegenerate, handleConnectClick, handleTransform,
        handleHeadingChange, handleCopy, handleTagsChange, isTransforming } = useIdeaCardActions({
        nodeId: id, getEditableContent, contentRef, generateFromPrompt, branchFromNode,
    });
    const { handleDuplicate } = useIdeaCardDuplicateAction(id);
    const { handleShare, isSharing } = useIdeaCardShareAction(id);
    const handleDelete = useCallback(() => { calendar.cleanupOnDelete(); rawDelete(); }, [calendar, rawDelete]);

    const handlePinToggle = useCallback(() => { useCanvasStore.getState().toggleNodePinned(id); }, [id]);
    const handleCollapseToggle = useCallback(() => { useCanvasStore.getState().toggleNodeCollapsed(id); }, [id]);
    const handleColorChange = useCallback((colorKey: NodeColorKey) => {
        useCanvasStore.getState().updateNodeColor(id, colorKey);
    }, [id]);
    const handleTagOpen = useCallback(() => { setShowTagInput(true); }, [setShowTagInput]);
    const handleFocusClick = useCallback(() => { useFocusStore.getState().enterFocus(id); }, [id]);

    const focusBody = useCallback(() => { if (editor) editor.commands.focus(); }, [editor]);
    const focusHeading = useCallback(() => { headingRef.current?.focus(); }, [headingRef]);
    const nodeShortcuts: NodeShortcutMap = useMemo(() => ({
        t: handleTagOpen, c: handleCollapseToggle, f: handleFocusClick,
    }), [handleTagOpen, handleCollapseToggle, handleFocusClick]);
    useNodeShortcuts(selected ?? false, nodeShortcuts);

    const { handleKeyDown, handleDoubleClick } = useNodeInput({
        nodeId: id, isEditing, editor, getMarkdown, setContent, getEditableContent, saveContent,
        submitHandlerRef, isGenerating: Boolean(isGenerating),
        isNewEmptyNode: !prompt && !output, focusHeading, shortcuts: nodeShortcuts,
    });

    const onTagsChange = useCallback((ids: string[]) => {
        handleTagsChange(ids);
        if (ids.length === 0) setShowTagInput(false);
    }, [handleTagsChange, setShowTagInput]);
    const onKeyDownReact = useCallback((e: React.KeyboardEvent) => handleKeyDown(e.nativeEvent), [handleKeyDown]);

    return {
        slashHandler, handleImageClick, handleDelete, handleRegenerate, handleConnectClick,
        handleTransform, handleHeadingChange, handleCopy, handleDuplicate, handleShare,
        isSharing, isTransforming, handlePinToggle, handleCollapseToggle, handleColorChange,
        handleTagOpen, handleFocusClick, handleDoubleClick, onSubmitAI,
        onTagsChange, onKeyDownReact, focusBody,
    };
}
