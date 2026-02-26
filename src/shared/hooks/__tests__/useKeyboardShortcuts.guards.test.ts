/**
 * useKeyboardShortcuts Guard Tests
 * Tests for input focus handling, capture phase, and edge cases
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { fireKeyDown } from './keyboardShortcutTestHelpers';

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: vi.fn(),
}));

describe('useKeyboardShortcuts guards', () => {
    const mockDeleteNode = vi.fn();
    const mockClearSelection = vi.fn();
    const mockOnOpenSettings = vi.fn();
    const mockOnAddNode = vi.fn();
    const mockOnQuickCapture = vi.fn();

    const mockEditingState = (editingNodeId: string | null = null) => {
        (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
            (selector?: (state: unknown) => unknown) => {
                const state = {
                    selectedNodeIds: new Set<string>(),
                    deleteNode: mockDeleteNode,
                    clearSelection: mockClearSelection,
                    editingNodeId,
                };
                return selector ? selector(state) : state;
            }
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockEditingState(null);
    });

    afterEach(() => { vi.restoreAllMocks(); });

    describe('Input Focus Handling', () => {
        it('should not trigger shortcuts when editingNodeId is set', () => {
            mockEditingState('node-42');
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            fireKeyDown('n');
            expect(mockOnAddNode).not.toHaveBeenCalled();
        });

        it('should not intercept Delete/Backspace when editingNodeId is set', () => {
            const selectedNodeIds = new Set(['node-1']);
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = {
                        selectedNodeIds, deleteNode: mockDeleteNode,
                        clearSelection: mockClearSelection, editingNodeId: 'node-1',
                    };
                    return selector ? selector(state) : state;
                }
            );
            renderHook(() => useKeyboardShortcuts({}));
            fireKeyDown('Delete');
            expect(mockDeleteNode).not.toHaveBeenCalled();
            fireKeyDown('Backspace');
            expect(mockDeleteNode).not.toHaveBeenCalled();
        });

        it('should not intercept Escape when editingNodeId is set', () => {
            mockEditingState('node-5');
            renderHook(() => useKeyboardShortcuts({}));
            fireKeyDown('Escape');
            expect(mockClearSelection).not.toHaveBeenCalled();
        });

        it('should still trigger Cmd+N when editingNodeId is set', () => {
            mockEditingState('node-42');
            renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
            fireKeyDown('n', { metaKey: true });
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        });

        it('should still trigger Cmd+, when editingNodeId is set', () => {
            mockEditingState('node-42');
            renderHook(() => useKeyboardShortcuts({ onOpenSettings: mockOnOpenSettings }));
            fireKeyDown(',', { metaKey: true });
            expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
        });

        it('should fire shortcuts normally when editingNodeId is null', () => {
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            fireKeyDown('n');
            expect(mockOnAddNode).toHaveBeenCalledTimes(1);
        });

        it('should not trigger shortcuts when typing in input (legacy DOM guard)', () => {
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            const input = document.createElement('input');
            document.body.appendChild(input);
            const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
            Object.defineProperty(event, 'target', { value: input });
            document.dispatchEvent(event);
            expect(mockOnAddNode).not.toHaveBeenCalled();
            input.remove();
        });

        it('should not trigger shortcuts when typing in textarea', () => {
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
            Object.defineProperty(event, 'target', { value: textarea });
            document.dispatchEvent(event);
            expect(mockOnAddNode).not.toHaveBeenCalled();
            textarea.remove();
        });

        it('should not trigger shortcuts when typing in contenteditable', () => {
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            const div = document.createElement('div');
            div.contentEditable = 'true';
            document.body.appendChild(div);
            div.focus();
            const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
            div.dispatchEvent(event);
            expect(mockOnAddNode).not.toHaveBeenCalled();
            div.remove();
        });
    });

    describe('Capture Phase Registration', () => {
        it('should register on document with capture phase', () => {
            const addSpy = vi.spyOn(document, 'addEventListener');
            renderHook(() => useKeyboardShortcuts({}));
            expect(addSpy).toHaveBeenCalledWith(
                'keydown', expect.any(Function), { capture: true },
            );
        });

        it('should call preventDefault on Cmd+N to block browser new-tab', () => {
            renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
            const event = fireKeyDown('n', { metaKey: true });
            expect(event.defaultPrevented).toBe(true);
        });

        it('should call preventDefault on Cmd+, to block browser behavior', () => {
            renderHook(() => useKeyboardShortcuts({ onOpenSettings: mockOnOpenSettings }));
            const event = fireKeyDown(',', { metaKey: true });
            expect(event.defaultPrevented).toBe(true);
        });

        it('should stopImmediatePropagation on Cmd+N', () => {
            renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
            const rivalHandler = vi.fn();
            document.addEventListener('keydown', rivalHandler, { capture: true });
            fireKeyDown('n', { metaKey: true });
            expect(rivalHandler).not.toHaveBeenCalled();
            document.removeEventListener('keydown', rivalHandler, { capture: true });
        });

        it('should stopImmediatePropagation on Cmd+,', () => {
            renderHook(() => useKeyboardShortcuts({ onOpenSettings: mockOnOpenSettings }));
            const rivalHandler = vi.fn();
            document.addEventListener('keydown', rivalHandler, { capture: true });
            fireKeyDown(',', { metaKey: true });
            expect(rivalHandler).not.toHaveBeenCalled();
            document.removeEventListener('keydown', rivalHandler, { capture: true });
        });
    });

    describe('Edge Cases', () => {
        it('should not trigger N shortcut when search input is focused', () => {
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            document.body.appendChild(searchInput);
            const event = new KeyboardEvent('keydown', {
                key: 'n', bubbles: true, cancelable: true,
            });
            Object.defineProperty(event, 'target', { value: searchInput });
            document.dispatchEvent(event);
            expect(mockOnAddNode).not.toHaveBeenCalled();
            searchInput.remove();
        });

        it('should handle N shortcut with multiple nodes selected', () => {
            const selectedNodeIds = new Set(['node-1', 'node-2', 'node-3']);
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = {
                        selectedNodeIds, deleteNode: mockDeleteNode, clearSelection: mockClearSelection,
                    };
                    return selector ? selector(state) : state;
                }
            );
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            fireKeyDown('n');
            expect(mockOnAddNode).toHaveBeenCalledTimes(1);
        });

        it('should handle rapid N key presses without error', () => {
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            expect(() => {
                for (let i = 0; i < 10; i++) fireKeyDown('n');
            }).not.toThrow();
            expect(mockOnAddNode).toHaveBeenCalledTimes(10);
        });

        it('should handle rapid Cmd+N presses without error', () => {
            renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
            expect(() => {
                for (let i = 0; i < 10; i++) fireKeyDown('n', { metaKey: true });
            }).not.toThrow();
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(10);
        });
    });
});
