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
import { GLOBAL_SHORTCUT_KEYS, toLowerKey } from '@/shared/constants/shortcutKeys';
import type { NodeShortcutMap } from './useNodeInput';

export function useNodeShortcuts(
    selected: boolean,
    shortcuts: NodeShortcutMap,
): void {
    // NOTE: inline boolean transform inside the selector is intentional and
    // MORE optimal than selecting the raw scalar. Returning a primitive means
    // Zustand’s Object.is(true, true) short-circuits re-renders when
    // editingNodeId changes between two different non-null values (e.g.
    // ’node-1’ → ’node-2’). Selecting the raw string would re-render on every
    // editingNodeId change even when isAnyEditing stays true.
    // The zustandSelectors structural rule targets object/array literals that
    // create new references each render — not primitive-returning comparisons.
    const isAnyEditing = useCanvasStore((s) => s.editingNodeId !== null);
    const isActive = selected && !isAnyEditing;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isActive) return;
        if (isEditableTarget(e)) return;

        // Only handle single-char keys without modifiers
        const isSingleChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (!isSingleChar) return;

        if (GLOBAL_SHORTCUT_KEYS.has(toLowerKey(e.key))) return;

        const handler = shortcuts[toLowerKey(e.key)];
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
