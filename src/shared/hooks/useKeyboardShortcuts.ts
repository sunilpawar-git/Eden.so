/**
 * useKeyboardShortcuts Hook - Global keyboard shortcuts
 */
import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';

interface KeyboardShortcutsOptions {
    onOpenSettings?: () => void;
    onAddNode?: () => void;
    onQuickCapture?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
    const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
    const deleteNode = useCanvasStore((s) => s.deleteNode);
    const clearSelection = useCanvasStore((s) => s.clearSelection);
    const editingNodeId = useCanvasStore((s) => s.editingNodeId);
    const { onOpenSettings, onAddNode, onQuickCapture } = options;

    const handleKeyDown = useCallback(
         
        (e: KeyboardEvent) => {
            // Cmd/Ctrl + N for Quick Capture (works even during editing)
            if ((e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N')) {
                e.preventDefault();
                onQuickCapture?.();
                return;
            }

            // Cmd/Ctrl + , to open settings (works even during editing)
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                onOpenSettings?.();
                return;
            }

            // Store-based guard: skip non-modifier shortcuts when a node is being edited
            if (editingNodeId) {
                return;
            }

            // Legacy DOM guard: skip when typing in native input/textarea/contenteditable
            const target = e.target as HTMLElement;
            const isEditable =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.contentEditable === 'true';
            if (isEditable) {
                return;
            }

            // N to add new node (without modifier)
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                onAddNode?.();
                return;
            }

            // Delete selected nodes
            if (e.key === 'Delete' || e.key === 'Backspace') {
                selectedNodeIds.forEach((nodeId) => {
                    deleteNode(nodeId);
                });
                clearSelection();
            }

            // Escape to clear selection
            if (e.key === 'Escape') {
                clearSelection();
            }
        },
        [selectedNodeIds, deleteNode, clearSelection, editingNodeId, onOpenSettings, onAddNode, onQuickCapture]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}
