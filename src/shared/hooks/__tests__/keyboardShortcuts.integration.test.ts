/**
 * Keyboard Shortcuts Integration Test
 * Verifies all documented shortcuts fire their expected actions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: vi.fn(),
}));

const fireKeyDown = (key: string, opts: Partial<KeyboardEvent> = {}) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
};

describe('Keyboard Shortcuts Integration', () => {
    const mockDeleteNode = vi.fn();
    const mockClearSelection = vi.fn();
    const mockOnOpenSettings = vi.fn();
    const mockOnAddNode = vi.fn();
    const mockOnQuickCapture = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
            (selector?: (state: unknown) => unknown) => {
                const state = {
                    selectedNodeIds: new Set(['node-1']),
                    deleteNode: mockDeleteNode,
                    clearSelection: mockClearSelection,
                    editingNodeId: null,
                };
                return selector ? selector(state) : state;
            }
        );
    });

    afterEach(() => { vi.restoreAllMocks(); });

    it('should handle all documented shortcuts without error', () => {
        renderHook(() => useKeyboardShortcuts({
            onOpenSettings: mockOnOpenSettings,
            onAddNode: mockOnAddNode,
            onQuickCapture: mockOnQuickCapture,
        }));

        // All shortcuts that should work
        expect(() => {
            fireKeyDown(',', { metaKey: true }); // Open Settings
            fireKeyDown('n', { metaKey: true });  // Quick Capture
            fireKeyDown('n');                      // Add Node
            fireKeyDown('Delete');                 // Delete selected
            fireKeyDown('Backspace');              // Delete selected (alt)
            fireKeyDown('Escape');                 // Clear selection
        }).not.toThrow();
    });

    it('Cmd+, should open settings', () => {
        renderHook(() => useKeyboardShortcuts({ onOpenSettings: mockOnOpenSettings }));
        fireKeyDown(',', { metaKey: true });
        expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('Cmd+N should quick capture', () => {
        renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
        fireKeyDown('n', { metaKey: true });
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
    });

    it('N should add node', () => {
        renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
        fireKeyDown('n');
        expect(mockOnAddNode).toHaveBeenCalledTimes(1);
    });

    it('Delete should delete selected nodes', () => {
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('Delete');
        expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
        expect(mockClearSelection).toHaveBeenCalled();
    });

    it('Backspace should delete selected nodes', () => {
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('Backspace');
        expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
        expect(mockClearSelection).toHaveBeenCalled();
    });

    it('Escape should clear selection', () => {
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('Escape');
        expect(mockClearSelection).toHaveBeenCalledTimes(1);
    });

    it('shortcuts should be suppressed when editing a node', () => {
        (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
            (selector?: (state: unknown) => unknown) => {
                const state = {
                    selectedNodeIds: new Set(['node-1']),
                    deleteNode: mockDeleteNode,
                    clearSelection: mockClearSelection,
                    editingNodeId: 'node-1',
                };
                return selector ? selector(state) : state;
            }
        );

        renderHook(() => useKeyboardShortcuts({
            onAddNode: mockOnAddNode,
            onOpenSettings: mockOnOpenSettings,
            onQuickCapture: mockOnQuickCapture,
        }));

        // Non-modifier shortcuts should be suppressed
        fireKeyDown('n');
        expect(mockOnAddNode).not.toHaveBeenCalled();
        fireKeyDown('Delete');
        expect(mockDeleteNode).not.toHaveBeenCalled();
        fireKeyDown('Escape');
        expect(mockClearSelection).not.toHaveBeenCalled();

        // Modifier shortcuts should still work
        fireKeyDown(',', { metaKey: true });
        expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
        fireKeyDown('n', { metaKey: true });
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
    });
});
