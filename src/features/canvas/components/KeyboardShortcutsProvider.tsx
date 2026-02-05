/**
 * KeyboardShortcutsProvider - Bridge component for keyboard shortcuts
 * Must be rendered inside ReactFlowProvider to access viewport methods
 */
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { useAddNode } from '../hooks/useAddNode';

interface KeyboardShortcutsProviderProps {
    onOpenSettings: () => void;
}

export function KeyboardShortcutsProvider({
    onOpenSettings,
}: KeyboardShortcutsProviderProps) {
    const handleAddNode = useAddNode();

    useKeyboardShortcuts({
        onOpenSettings,
        onAddNode: handleAddNode,
    });

    // This component only provides keyboard shortcuts, no UI
    return null;
}
