/**
 * KeyboardShortcutsProvider - Bridge component for keyboard shortcuts
 * Must be rendered inside ReactFlowProvider to access viewport methods
 */
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { useAddNode } from '../hooks/useAddNode';
import { useQuickCapture } from '../hooks/useQuickCapture';

interface KeyboardShortcutsProviderProps {
    onOpenSettings: () => void;
}

export function KeyboardShortcutsProvider({
    onOpenSettings,
}: KeyboardShortcutsProviderProps) {
    const handleAddNode = useAddNode();
    const handleQuickCapture = useQuickCapture();

    useKeyboardShortcuts({
        onOpenSettings,
        onAddNode: handleAddNode,
        onQuickCapture: handleQuickCapture,
    });

    // This component only provides keyboard shortcuts, no UI
    return null;
}
