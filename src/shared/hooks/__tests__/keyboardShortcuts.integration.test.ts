/**
 * Keyboard Shortcuts Integration Test
 * Verifies all documented shortcuts fire their expected actions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { _resetEscapeLayer } from '@/shared/hooks/useEscapeLayer.testUtils';
import { isNodeCreationLocked, _resetNodeCreationLock, _setNodeCreationLocked } from '@/features/canvas/hooks/useQuickCapture';

import { fireKeyDown } from './keyboardShortcutTestHelpers';

const { mockClearSelection, mockCanvasStore } = vi.hoisted(() => {
    const mockDeleteNode = vi.fn();
    const mockClearSelection = vi.fn();
    // Shared mutable state — tests can override selectedNodeIds / editingNodeId.
    // Reset to defaults in beforeEach so each test gets a clean slate.
    const _state = {
        selectedNodeIds: new Set<string>(['node-1']),
        editingNodeId: null as string | null,
    };
    const mockCanvasStore = Object.assign(
        vi.fn((selector?: (state: unknown) => unknown) => {
            return selector ? selector(_state) : _state;
        }),
        {
            getState: () => ({
                deleteNode: mockDeleteNode,
                clearSelection: mockClearSelection,
                selectedNodeIds: _state.selectedNodeIds,
            }),
            _state,
        },
    );
    return { mockClearSelection, mockCanvasStore };
});

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: mockCanvasStore,
}));

describe('Keyboard Shortcuts Integration', () => {
    const mockOnOpenSettings = vi.fn();
    const mockOnAddNode = vi.fn();
    const mockOnQuickCapture = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        _resetEscapeLayer();
        _resetNodeCreationLock();
        mockCanvasStore._state.selectedNodeIds = new Set<string>(['node-1']);
        mockCanvasStore._state.editingNodeId = null;
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
        const mockOnDeleteNodes = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onDeleteNodes: mockOnDeleteNodes }));
        fireKeyDown('Delete');
        expect(mockOnDeleteNodes).toHaveBeenCalledWith(['node-1']);
        // clearSelection is NOT called synchronously — deleteNodeWithUndo is async
        // and clears the selection atomically inside deleteNodes() after confirm resolves.
        expect(mockClearSelection).not.toHaveBeenCalled();
    });

    it('Backspace should delete selected nodes', () => {
        const mockOnDeleteNodes = vi.fn();
        renderHook(() => useKeyboardShortcuts({ onDeleteNodes: mockOnDeleteNodes }));
        fireKeyDown('Backspace');
        expect(mockOnDeleteNodes).toHaveBeenCalledWith(['node-1']);
        // clearSelection is NOT called synchronously — see Delete test comment above.
        expect(mockClearSelection).not.toHaveBeenCalled();
    });

    it('Escape should clear selection', () => {
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('Escape');
        expect(mockClearSelection).toHaveBeenCalledTimes(1);
    });

    it('Cmd+N should preventDefault to block browser new-tab behavior', () => {
        renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
        const event = fireKeyDown('n', { metaKey: true });
        expect(event.defaultPrevented).toBe(true);
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
    });

    it('Cmd+N should stopImmediatePropagation to prevent other handlers', () => {
        renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));

        const rivalHandler = vi.fn();
        document.addEventListener('keydown', rivalHandler, { capture: true });

        fireKeyDown('n', { metaKey: true });
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        expect(rivalHandler).not.toHaveBeenCalled();

        document.removeEventListener('keydown', rivalHandler, { capture: true });
    });

    // ─── E2E: creation-lock window (exercises the real module variable) ────────
    // This test wires useKeyboardShortcuts to the real isNodeCreationLocked
    // function so the full path is covered:
    //   _setNodeCreationLocked() → isNodeCreationLocked() returns true
    //   → handlePlainShortcuts suppresses n
    //   → _resetNodeCreationLock() simulates the 50 ms timer callback
    //   → isNodeCreationLocked() returns false → n fires normally.
    it('plain n is suppressed during the creation-lock window and allowed once released', () => {
        const mockOnAddNodeLocal = vi.fn();
        _setNodeCreationLocked(); // simulate ⌘+N having just fired
        renderHook(() => useKeyboardShortcuts({
            onAddNode: mockOnAddNodeLocal,
            isNodeCreationLocked, // real function reading the module variable
        }));

        fireKeyDown('n');
        expect(mockOnAddNodeLocal).not.toHaveBeenCalled(); // lock held

        _resetNodeCreationLock(); // simulate the 50 ms timer callback
        fireKeyDown('n');
        expect(mockOnAddNodeLocal).toHaveBeenCalledTimes(1); // lock released
    });

    it('N key from search input should not trigger addNode', () => {
        renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));

        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);
        input.focus();

        const event = new KeyboardEvent('keydown', {
            key: 'n', bubbles: true, cancelable: true,
        });
        Object.defineProperty(event, 'target', { value: input });
        document.dispatchEvent(event);

        expect(mockOnAddNode).not.toHaveBeenCalled();
        input.remove();
    });

    it('Cmd+K focuses search input when shortcut hook is mounted', () => {
        const ref = { focus: vi.fn(), select: vi.fn() };
        renderHook(() => useKeyboardShortcuts({ searchInputRef: { current: ref } }));
        const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true });
        document.dispatchEvent(ev);
        expect(ref.focus).toHaveBeenCalled();
        expect(ref.select).toHaveBeenCalled();
    });

    it('destructive shortcuts (Delete, Escape) are suppressed when editing a node', () => {
        // editingNodeId guards Delete/Backspace and Escape, but NOT N.
        // N is guarded only by isEditableTarget (real-time focus check).
        mockCanvasStore._state.editingNodeId = 'node-1';

        const mockOnDeleteNodes = vi.fn();
        renderHook(() => useKeyboardShortcuts({
            onAddNode: mockOnAddNode,
            onOpenSettings: mockOnOpenSettings,
            onQuickCapture: mockOnQuickCapture,
            onDeleteNodes: mockOnDeleteNodes,
        }));

        fireKeyDown('Delete');
        expect(mockOnDeleteNodes).not.toHaveBeenCalled();
        fireKeyDown('Escape');
        expect(mockClearSelection).not.toHaveBeenCalled();

        // Modifier shortcuts should still work regardless of editingNodeId
        fireKeyDown(',', { metaKey: true });
        expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
        fireKeyDown('n', { metaKey: true });
        expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
    });

    it('N fires even when editingNodeId is set, if the event target is not editable', () => {
        // After the fix: N is guarded by isEditableTarget (real-time focus), not editingNodeId.
        // fireKeyDown dispatches on document — target is not contentEditable → N goes through.
        mockCanvasStore._state.editingNodeId = 'node-1';

        renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
        fireKeyDown('n');
        expect(mockOnAddNode).toHaveBeenCalledTimes(1);
    });
});

// ─── Escape priority ordering ───────────────────────────────────────────────
describe('Escape priority ordering', () => {
    beforeEach(() => {
        _resetEscapeLayer();
        _resetNodeCreationLock();
        // Reset canvas store state to prevent bleed from tests in the sibling
        // describe that mutate _state (e.g. the 'editing node' test sets
        // editingNodeId = 'node-1' which would suppress plain-n tests here).
        mockCanvasStore._state.editingNodeId = null;
        mockCanvasStore._state.selectedNodeIds = new Set<string>(['node-1']);
    });

    it('fires only the highest-priority handler when multiple overlays are active', () => {
        const settingsHandler = vi.fn();
        const modalHandler = vi.fn();
        // Settings panel = priority 70, Modal (ExportDialog) = priority 80
        renderHook(() => {
            useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, settingsHandler);
            useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, modalHandler);
        });
        fireKeyDown('Escape');
        expect(modalHandler).toHaveBeenCalledTimes(1);   // highest priority fires
        expect(settingsHandler).not.toHaveBeenCalled();  // lower priority silent
    });

    it('falls back to Settings handler after MODAL layer deactivates', () => {
        const settingsHandler = vi.fn();
        const modalHandler = vi.fn();
        const { rerender } = renderHook(
            ({ modalActive }: { modalActive: boolean }) => {
                useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, settingsHandler);
                useEscapeLayer(ESCAPE_PRIORITY.MODAL, modalActive, modalHandler);
            },
            { initialProps: { modalActive: true } },
        );
        rerender({ modalActive: false });
        fireKeyDown('Escape');
        expect(settingsHandler).toHaveBeenCalledTimes(1);
        expect(modalHandler).not.toHaveBeenCalled();
    });

    it('plain n is suppressed when Settings panel is registered and active', () => {
        const mockOnAddNode = vi.fn();
        renderHook(() => {
            useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, vi.fn());
            useKeyboardShortcuts({ onAddNode: mockOnAddNode });
        });
        fireKeyDown('n');
        expect(mockOnAddNode).not.toHaveBeenCalled();
    });

    it('plain n fires normally once all overlays deactivate', () => {
        const mockOnAddNode = vi.fn();
        const { rerender } = renderHook(
            ({ overlayActive }: { overlayActive: boolean }) => {
                useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, overlayActive, vi.fn());
                useKeyboardShortcuts({ onAddNode: mockOnAddNode });
            },
            { initialProps: { overlayActive: true } },
        );
        fireKeyDown('n');
        expect(mockOnAddNode).not.toHaveBeenCalled(); // overlay active

        rerender({ overlayActive: false });
        fireKeyDown('n');
        expect(mockOnAddNode).toHaveBeenCalledTimes(1); // overlay gone
    });
});
