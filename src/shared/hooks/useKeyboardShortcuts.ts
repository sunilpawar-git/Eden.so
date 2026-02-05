/**
 * useKeyboardShortcuts Hook - Global keyboard shortcuts
 */
import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';

interface KeyboardShortcutsOptions {
    onOpenSettings?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
    const { selectedNodeIds, deleteNode, clearSelection } = useCanvasStore();
    const { onOpenSettings } = options;

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Don't handle shortcuts when typing in inputs
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Cmd/Ctrl + , to open settings
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                onOpenSettings?.();
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
        [selectedNodeIds, deleteNode, clearSelection, onOpenSettings]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}
