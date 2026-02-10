/**
 * useNodeInput - Single input router for IdeaCard nodes
 * Replaces useIdeaCardKeyboard + useIdeaCardEditor keyboard logic
 * Reads editingNodeId from canvasStore (SSOT), routes view/edit keys
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useLinkPreviewFetch } from './useLinkPreviewFetch';

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
    /** Ref for Enter/Escape handlers fed into the SubmitKeymap TipTap extension */
    submitHandlerRef: React.MutableRefObject<import('../extensions/submitKeymap').SubmitKeymapHandler | null>;
    isGenerating: boolean;
    /** True when the node is freshly created and empty — auto-enters edit mode */
    isNewEmptyNode: boolean;
}

export interface UseNodeInputReturn {
    isEditing: boolean;
    handleKeyDown: (e: KeyboardEvent) => void;
    handleDoubleClick: () => void;
}

export function useNodeInput(options: UseNodeInputOptions): UseNodeInputReturn {
    const {
        nodeId, editor, getMarkdown, setContent,
        getEditableContent, saveContent,
        onSubmitNote, onSubmitAI, suggestionActiveRef, submitHandlerRef,
        isGenerating, isNewEmptyNode,
    } = options;

    const isEditing = useCanvasStore((s) => s.editingNodeId === nodeId);
    const draftContent = useCanvasStore((s) => s.draftContent);

    // Memoize detected URLs to prevent useLinkPreviewFetch effect re-firing every render
    const detectedUrls = useMemo(
        () => (isEditing ? extractUrls(draftContent) : []),
        [isEditing, draftContent],
    );
    useLinkPreviewFetch(nodeId, detectedUrls);

    const enterEditing = useCallback(() => {
        setContent(getEditableContent());
        useCanvasStore.getState().startEditing(nodeId);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (editor) editor.setEditable(true);
    }, [nodeId, editor, setContent, getEditableContent]);

    // Auto-enter edit mode for freshly created empty nodes
    const autoEditRef = useRef(isNewEmptyNode);
    useEffect(() => {
        if (autoEditRef.current && editor) {
            autoEditRef.current = false;
            enterEditing();
            // Defer focus to ensure editor DOM is ready after state update
            queueMicrotask(() => {
                editor.commands.focus();
            });
        }
    }, [editor, enterEditing]);

    const exitEditing = useCallback(() => {
        saveContent(getMarkdown());
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (editor) editor.setEditable(false);
        useCanvasStore.getState().stopEditing();
    }, [saveContent, getMarkdown, editor]);

    // Keep the SubmitKeymap extension's handler ref in sync so that Enter
    // and Escape are intercepted at the ProseMirror level (before StarterKit
    // creates a new paragraph).
    useEffect(() => {
        submitHandlerRef.current = {
            onEnter: () => {
                if (suggestionActiveRef.current) return false;
                const trimmed = getMarkdown().trim();
                if (!trimmed) {
                    useCanvasStore.getState().stopEditing();
                    return true;
                }
                const currentMode = useCanvasStore.getState().inputMode;
                if (currentMode === 'ai') onSubmitAI(trimmed);
                else onSubmitNote(trimmed);
                return true;
            },
            onEscape: () => {
                exitEditing();
                return true;
            },
        };
        return () => { submitHandlerRef.current = null; };
    }, [submitHandlerRef, suggestionActiveRef, getMarkdown, onSubmitNote, onSubmitAI, exitEditing]);

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
                if (!editor) return;
                // Use simulateTextInput so TipTap plugins (e.g. Suggestion) fire.
                // insertContent() bypasses handleTextInput, breaking slash commands.
                const { state, dispatch } = editor.view;
                const { from, to } = state.selection;
                const tr = state.tr.insertText(char, from, to);
                dispatch(tr);
            });
        }
    }, [isGenerating, enterEditing, editor]);

    const handleEditModeKey = useCallback((e: KeyboardEvent) => {
        // Enter and Escape are handled by the SubmitKeymap TipTap extension
        // at the ProseMirror level (before the event bubbles to this div).
        // We must NOT re-handle them here because by the time the event
        // reaches this React handler, the Suggestion plugin may have already
        // changed suggestionActiveRef (e.g. after selecting a slash command),
        // causing a false-positive empty-content submit.
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (isEditing) handleEditModeKey(e);
        else handleViewModeKey(e);
    }, [isEditing, handleEditModeKey, handleViewModeKey]);

    const handleDoubleClick = useCallback(() => {
        if (!isGenerating) enterEditing();
    }, [isGenerating, enterEditing]);

    return { isEditing, handleKeyDown, handleDoubleClick };
}
