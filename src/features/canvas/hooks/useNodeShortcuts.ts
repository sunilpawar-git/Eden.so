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
import { isEditableTarget } from '@/shared/utils/domGuards';
import { GLOBAL_SHORTCUT_KEYS } from '@/shared/constants/shortcutKeys';
import type { NodeShortcutMap } from './useNodeInput';

export function useNodeShortcuts(
    selected: boolean,
    shortcuts: NodeShortcutMap,
): void {
    const isAnyEditing = useCanvasStore((s) => s.editingNodeId !== null);
    const isActive = selected && !isAnyEditing;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isActive) return;
        if (isEditableTarget(e)) return;

        // Only handle single-char keys without modifiers
        const isSingleChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (!isSingleChar) return;

        if (GLOBAL_SHORTCUT_KEYS.has(e.key.toLowerCase())) return;

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
