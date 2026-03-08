/**
 * KeyboardShortcutsProvider - Bridge component for keyboard shortcuts
 * Must be rendered inside ReactFlowProvider to access viewport methods
 */
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { useAddNode } from '../hooks/useAddNode';
import { useQuickCapture, isNodeCreationLocked } from '../hooks/useQuickCapture';
import { useUndoableActions } from '../hooks/useUndoableActions';

interface KeyboardShortcutsProviderProps {
    onOpenSettings: () => void;
}

export function KeyboardShortcutsProvider({
    onOpenSettings,
}: KeyboardShortcutsProviderProps) {
    const handleAddNode = useAddNode();
    const handleQuickCapture = useQuickCapture();
    const { deleteNodeWithUndo } = useUndoableActions();

    useKeyboardShortcuts({
        onOpenSettings,
        onAddNode: handleAddNode,
        onQuickCapture: handleQuickCapture,
        onDeleteNodes: deleteNodeWithUndo,
        isNodeCreationLocked,
    });

    // This component only provides keyboard shortcuts, no UI
    return null;
}
