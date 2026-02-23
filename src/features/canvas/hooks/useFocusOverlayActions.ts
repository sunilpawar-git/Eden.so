/**
 * useFocusOverlayActions — ViewModel logic for FocusOverlay
 * Extracts editing lifecycle, content save, ESC handling, and heading/tag handlers
 * so FocusOverlay stays under component line limits.
 */
import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { strings } from '@/shared/localization/strings';
import { useIdeaCardEditor } from './useIdeaCardEditor';

interface UseFocusOverlayActionsOptions {
    nodeId: string;
    output: string | undefined;
    isEditing: boolean;
    onExit: () => void;
}

export function useFocusOverlayActions({ nodeId, output, isEditing, onExit }: UseFocusOverlayActionsOptions) {
    useEffect(() => {
        if (nodeId) { useCanvasStore.getState().startEditing(nodeId); }
    }, [nodeId]);

    const handleDoubleClick = useCallback(() => {
        if (!nodeId) return;
        useCanvasStore.getState().startEditing(nodeId);
    }, [nodeId]);

    const handleHeadingChange = useCallback((h: string) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeHeading(nodeId, h);
    }, [nodeId]);

    const handleTagsChange = useCallback((ids: string[]) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeTags(nodeId, ids);
    }, [nodeId]);

    const saveContent = useCallback((markdown: string) => {
        if (!nodeId) return;
        useCanvasStore.getState().updateNodeOutput(nodeId, markdown);
    }, [nodeId]);

    const getEditableContent = useCallback(() => output ?? '', [output]);

    const { editor, getMarkdown, submitHandlerRef } = useIdeaCardEditor({
        isEditing,
        output,
        getEditableContent,
        placeholder: strings.ideaCard.inputPlaceholder,
        saveContent,
        onExitEditing: useCallback(() => { useCanvasStore.getState().stopEditing(); }, []),
    });

    const saveBeforeExit = useCallback(() => {
        if (!nodeId) return;
        saveContent(getMarkdown());
    }, [nodeId, getMarkdown, saveContent]);

    useEffect(() => {
        submitHandlerRef.current = {
            onEnter: () => false,
            onEscape: () => {
                saveBeforeExit();
                onExit();
                return true;
            },
        };
        return () => { submitHandlerRef.current = null; };
    }, [saveBeforeExit, onExit]);

    return { editor, handleDoubleClick, handleHeadingChange, handleTagsChange, saveBeforeExit };
}
