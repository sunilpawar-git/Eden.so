/**
 * useNodeShortcuts — Document-level keyboard shortcuts for selected nodes
 *
 * Listens on `document` (not on a specific DOM element) so shortcuts fire
 * regardless of which element has focus. Only active when the node is
 * selected AND not being edited.
 *
 * Guards:
 * - Skips when editingNodeId is set (any node is in edit mode)
 * - Skips when target is an input/textarea/contenteditable
 * - Only processes single-char keys without modifiers
 */
import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import type { NodeShortcutMap } from './useNodeInput';

/** Check if event target is an editable DOM element */
function isEditableTarget(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement;
    return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.contentEditable === 'true'
    );
}

export function useNodeShortcuts(
    _nodeId: string,
    selected: boolean,
    shortcuts: NodeShortcutMap,
): void {
    const editingNodeId = useCanvasStore((s) => s.editingNodeId);
    const isActive = selected && !editingNodeId;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isActive) return;
        if (isEditableTarget(e)) return;

        // Only handle single-char keys without modifiers
        const isSingleChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (!isSingleChar) return;

        const handler = shortcuts[e.key.toLowerCase()];
        if (handler) {
            e.preventDefault();
            e.stopPropagation();
            handler();
        }
    }, [isActive, shortcuts]);

    useEffect(() => {
        if (!isActive) return;

        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [isActive, handleKeyDown]);
}
