/**
 * useNodeInput - Single input router for IdeaCard nodes
 * Replaces useIdeaCardKeyboard + useIdeaCardEditor keyboard logic
 * Reads editingNodeId from canvasStore (SSOT), routes view/edit keys
 */
import { useCallback, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useLinkPreviewFetch } from './useLinkPreviewFetch';
import type { InputMode } from '../types/slashCommand';

/** Regex to extract http/https URLs from text */
const URL_REGEX = /https?:\/\/[^\s)]+/g;

/** Extract unique URLs from text content */
function extractUrls(text: string | null): string[] {
    if (!text) return [];
    const matches = text.match(URL_REGEX);
    return matches ? [...new Set(matches)] : [];
}

export interface UseNodeInputOptions {
    nodeId: string;
    editor: Editor | null;
    getMarkdown: () => string;
    setContent: (markdown: string) => void;
    getEditableContent: () => string;
    saveContent: (markdown: string) => void;
    onSubmitNote: (trimmed: string) => void;
    onSubmitAI: (trimmed: string) => void;
    suggestionActiveRef: React.RefObject<boolean>;
    isGenerating: boolean;
}

export interface UseNodeInputReturn {
    isEditing: boolean;
    inputMode: InputMode;
    handleKeyDown: (e: KeyboardEvent) => void;
    handleDoubleClick: () => void;
}

export function useNodeInput(options: UseNodeInputOptions): UseNodeInputReturn {
    const {
        nodeId, editor, getMarkdown, setContent,
        getEditableContent, saveContent,
        onSubmitNote, onSubmitAI, suggestionActiveRef, isGenerating,
    } = options;

    const isEditing = useCanvasStore((s) => s.editingNodeId === nodeId);
    const inputMode = useCanvasStore((s) => s.inputMode);
    const draftContent = useCanvasStore((s) => s.draftContent);

    // Wire link preview fetching with URL detection
    const detectedUrls = isEditing ? extractUrls(draftContent) : [];
    useLinkPreviewFetch(nodeId, detectedUrls);

    const enterEditing = useCallback(() => {
        setContent(getEditableContent());
        useCanvasStore.getState().startEditing(nodeId);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (editor) editor.setEditable(true);
    }, [nodeId, editor, setContent, getEditableContent]);

    const exitEditing = useCallback(() => {
        saveContent(getMarkdown());
        useCanvasStore.getState().stopEditing();
    }, [saveContent, getMarkdown]);

    // Paste handler: immediately update draft for URL detection (no debounce)
    useEffect(() => {
        if (!isEditing || !editor) return;
        const dom = editor.view.dom;
        const onPaste = () => {
            // Defer to let TipTap process paste first, then read updated content
            queueMicrotask(() => {
                useCanvasStore.getState().updateDraft(getMarkdown());
            });
        };
        dom.addEventListener('paste', onPaste);
        return () => { dom.removeEventListener('paste', onPaste); };
    }, [isEditing, editor, getMarkdown]);

    const handleViewModeKey = useCallback((e: KeyboardEvent) => {
        if (isGenerating) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            enterEditing();
            return;
        }

        const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isPrintable) {
            e.preventDefault();
            e.stopPropagation();
            enterEditing();
            // Defer character insertion until editor is ready
            const char = e.key;
            queueMicrotask(() => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (editor) editor.commands.insertContent(char);
            });
        }
    }, [isGenerating, enterEditing, editor]);

    const handleEditModeKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            exitEditing();
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey && !suggestionActiveRef.current) {
            e.preventDefault();
            e.stopPropagation();
            const trimmed = getMarkdown().trim();
            if (!trimmed) {
                useCanvasStore.getState().stopEditing();
                return;
            }
            const currentMode = useCanvasStore.getState().inputMode;
            if (currentMode === 'ai') onSubmitAI(trimmed);
            else onSubmitNote(trimmed);
        }
    }, [exitEditing, getMarkdown, suggestionActiveRef, onSubmitNote, onSubmitAI]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (isEditing) handleEditModeKey(e);
        else handleViewModeKey(e);
    }, [isEditing, handleEditModeKey, handleViewModeKey]);

    const handleDoubleClick = useCallback(() => {
        if (!isGenerating) enterEditing();
    }, [isGenerating, enterEditing]);

    return { isEditing, inputMode, handleKeyDown, handleDoubleClick };
}
