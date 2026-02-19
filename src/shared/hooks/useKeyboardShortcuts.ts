/**
 * useKeyboardShortcuts Hook - Global keyboard shortcuts
 * Registered on document capture phase to intercept before browser defaults.
 */
import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { isEditableTarget } from '@/shared/utils/domGuards';

interface KeyboardShortcutsOptions {
    onOpenSettings?: () => void;
    onAddNode?: () => void;
    onQuickCapture?: () => void;
}

function hasModifier(e: KeyboardEvent): boolean {
    return e.metaKey || e.ctrlKey;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const deleteNode = useCanvasStore((s) => s.deleteNode);
    const clearSelection = useCanvasStore((s) => s.clearSelection);
    const editingNodeId = useCanvasStore((s) => s.editingNodeId);
    const { onOpenSettings, onAddNode, onQuickCapture } = options;

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (handleModifierShortcuts(e, onQuickCapture, onOpenSettings)) {
                return;
            }

            if (editingNodeId) return;
            if (isEditableTarget(e)) return;

            handlePlainShortcuts(e, onAddNode, selectedNodeIds, deleteNode, clearSelection);
        },
        [selectedNodeIds, deleteNode, clearSelection, editingNodeId, onOpenSettings, onAddNode, onQuickCapture]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            document.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [handleKeyDown]);
}

/** Modifier shortcuts (Cmd/Ctrl+key). Returns true if handled. */
function handleModifierShortcuts(
    e: KeyboardEvent,
    onQuickCapture?: () => void,
    onOpenSettings?: () => void,
): boolean {
    if (!hasModifier(e)) return false;

    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onQuickCapture?.();
        return true;
    }

    if (e.key === ',') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onOpenSettings?.();
        return true;
    }

    return false;
}

/** Plain (non-modifier) shortcuts for canvas operations. */
function handlePlainShortcuts(
    e: KeyboardEvent,
    onAddNode?: () => void,
    selectedNodeIds?: Set<string>,
    deleteNode?: (id: string) => void,
    clearSelection?: () => void,
): void {
    if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onAddNode?.();
        return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        selectedNodeIds?.forEach((nodeId) => deleteNode?.(nodeId));
        clearSelection?.();
        return;
    }

    if (e.key === 'Escape') {
        clearSelection?.();
    }
}
