/**
 * useToolbarDrag — Encapsulates HTML5 drag-and-drop state for ToolbarSection.
 * Tracks which action is being dragged and which is the current drop target.
 * Calls reorderUtilsBarAction on drop to update the store.
 */
import { useState, useCallback } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import type { UtilsBarActionId, UtilsBarDeck } from '@/features/canvas/types/utilsBarLayout';

export interface ToolbarDragHandlers {
    draggedId: UtilsBarActionId | null;
    dropTargetId: UtilsBarActionId | null;
    handleDragStart: (id: UtilsBarActionId) => (e: React.DragEvent) => void;
    handleDragOver: (id: UtilsBarActionId, deck: UtilsBarDeck, index: number) => (e: React.DragEvent) => void;
    handleDrop: (id: UtilsBarActionId, deck: UtilsBarDeck, index: number) => (e: React.DragEvent) => void;
    handleDragEnd: () => void;
}

export function useToolbarDrag(): ToolbarDragHandlers {
    const [draggedId, setDraggedId] = useState<UtilsBarActionId | null>(null);
    const [dropTargetId, setDropTargetId] = useState<UtilsBarActionId | null>(null);

    const handleDragStart = useCallback(
        (id: UtilsBarActionId) => (e: React.DragEvent) => {
            // dataTransfer is typed as non-null by React but jsdom returns null in tests.
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (e.dataTransfer) {
                // Required for Firefox to initiate drag; value is not read back
                e.dataTransfer.setData('text/plain', id);
                e.dataTransfer.effectAllowed = 'move';
            }
            setDraggedId(id);
        },
        [],
    );

    const handleDragOver = useCallback(
        (id: UtilsBarActionId, _deck: UtilsBarDeck, _index: number) => (e: React.DragEvent) => {
            e.preventDefault();
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            setDropTargetId(id);
        },
        [],
    );

    const handleDrop = useCallback(
        (targetId: UtilsBarActionId, targetDeck: UtilsBarDeck, targetIndex: number) =>
            (e: React.DragEvent) => {
                e.preventDefault();
                const sourceId = draggedId;
                setDraggedId(null);
                setDropTargetId(null);
                if (!sourceId || sourceId === targetId) return;
                useSettingsStore.getState().reorderUtilsBarAction(sourceId, targetDeck, targetIndex);
            },
        [draggedId],
    );

    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        setDropTargetId(null);
    }, []);

    return { draggedId, dropTargetId, handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}
