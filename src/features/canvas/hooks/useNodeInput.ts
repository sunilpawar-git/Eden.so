/**
 * useNodeInput - Single input router for IdeaCard nodes
 * Replaces useIdeaCardKeyboard + useIdeaCardEditor keyboard logic
 * Reads editingNodeId from canvasStore (SSOT), routes view/edit keys
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import type { SubmitKeymapHandler } from '../extensions/submitKeymap';
import { useCanvasStore } from '../stores/canvasStore';
import { useLinkPreviewFetch } from './useLinkPreviewFetch';
import { GLOBAL_SHORTCUT_KEYS } from '@/shared/constants/shortcutKeys';

/** Regex to extract http/https URLs from text */
const URL_REGEX = /https?:\/\/[^\s)]+/g;

/** Extract unique URLs from text content */
function extractUrls(text: string | null): string[] {
    if (!text) return [];
    const matches = text.match(URL_REGEX);
    return matches ? [...new Set(matches)] : [];
}

/** Map of single-character keys to shortcut callbacks (view mode only) */
export type NodeShortcutMap = Record<string, () => void>;

export interface UseNodeInputOptions {
    nodeId: string;
    editor: Editor | null;
    getMarkdown: () => string;
    setContent: (markdown: string) => void;
    getEditableContent: () => string;
    saveContent: (markdown: string) => void;
    /** Ref for Enter/Escape handlers fed into the SubmitKeymap TipTap extension */
    submitHandlerRef: React.MutableRefObject<SubmitKeymapHandler | null>;
    isGenerating: boolean;
    /** True when the node is freshly created and empty — auto-enters edit mode */
    isNewEmptyNode: boolean;
    /** Focus the heading editor instead of body — called for auto-edit of new nodes */
    focusHeading?: () => void;
    /** Keyboard shortcuts active in view mode (e.g. { t: onTagClick, c: onCollapse }) */
    shortcuts?: NodeShortcutMap;
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
        submitHandlerRef,
        isGenerating, isNewEmptyNode, focusHeading,
        shortcuts,
    } = options;

    const isEditing = useCanvasStore((s) => s.editingNodeId === nodeId);
    const draftContent = useCanvasStore((s) => s.draftContent);

    // Detect URLs from draft content (editing) or persisted output (view mode)
    const nodeOutput = useCanvasStore((s) => {
        const node = s.nodes.find((n) => n.id === nodeId);
        return node?.data.output;
    });
    const detectedUrls = useMemo(
        () => extractUrls(isEditing ? draftContent : (nodeOutput ?? null)),
        [isEditing, draftContent, nodeOutput],
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
                if (focusHeading) focusHeading();
                else editor.commands.focus();
            });
        }
    }, [editor, enterEditing, focusHeading]);

    const exitEditing = useCallback(() => {
        saveContent(getMarkdown());
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (editor) editor.setEditable(false);
        useCanvasStore.getState().stopEditing();
    }, [saveContent, getMarkdown, editor]);

    // Keep the SubmitKeymap extension's handler ref in sync so that Enter
    // falls through to StarterKit (notepad behavior) and Escape exits editing.
    useEffect(() => {
        submitHandlerRef.current = {
            onEnter: () => {
                // Return false: let StarterKit create a new paragraph (notepad behavior).
                // Content is saved via Escape (onEscape) and blur (useIdeaCardEditor handleBlur).
                return false;
            },
            onEscape: () => {
                exitEditing();
                return true;
            },
        };
        return () => { submitHandlerRef.current = null; };
    }, [submitHandlerRef, exitEditing]);

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

        // Check shortcuts before falling through to "enter edit + insert char"
        const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (isPrintable && shortcuts) {
            const handler = shortcuts[e.key.toLowerCase()];
            if (handler) {
                e.preventDefault();
                e.stopPropagation();
                handler();
                return;
            }
        }

        if (isPrintable && GLOBAL_SHORTCUT_KEYS.has(e.key.toLowerCase())) {
            return;
        }

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
    }, [isGenerating, enterEditing, editor, shortcuts]);

    const handleEditModeKey = useCallback((_e: KeyboardEvent) => {
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
