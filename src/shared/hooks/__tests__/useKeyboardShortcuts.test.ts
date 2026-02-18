/**
 * useKeyboardShortcuts Hook Tests
 * TDD: Tests for global keyboard shortcuts (core functionality)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { fireKeyDown } from './keyboardShortcutTestHelpers';

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: vi.fn(),
}));

describe('useKeyboardShortcuts', () => {
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
                    selectedNodeIds: new Set<string>(),
                    deleteNode: mockDeleteNode,
                    clearSelection: mockClearSelection,
                };
                return selector ? selector(state) : state;
            }
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Open Settings (Cmd/Ctrl + ,)', () => {
        it('should call onOpenSettings when Cmd+, is pressed', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onOpenSettings: mockOnOpenSettings })
            );
            fireKeyDown(',', { metaKey: true });
            expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
        });

        it('should call onOpenSettings when Ctrl+, is pressed', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onOpenSettings: mockOnOpenSettings })
            );
            fireKeyDown(',', { ctrlKey: true });
            expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
        });
    });

    describe('Delete Node (Delete/Backspace)', () => {
        it('should delete selected nodes when Delete is pressed', () => {
            const selectedNodeIds = new Set(['node-1', 'node-2']);
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = { selectedNodeIds, deleteNode: mockDeleteNode, clearSelection: mockClearSelection };
                    return selector ? selector(state) : state;
                }
            );
            renderHook(() => useKeyboardShortcuts({}));
            fireKeyDown('Delete');
            expect(mockDeleteNode).toHaveBeenCalledTimes(2);
            expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
            expect(mockDeleteNode).toHaveBeenCalledWith('node-2');
            expect(mockClearSelection).toHaveBeenCalledTimes(1);
        });

        it('should delete selected nodes when Backspace is pressed', () => {
            const selectedNodeIds = new Set(['node-1']);
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = { selectedNodeIds, deleteNode: mockDeleteNode, clearSelection: mockClearSelection };
                    return selector ? selector(state) : state;
                }
            );
            renderHook(() => useKeyboardShortcuts({}));
            fireKeyDown('Backspace');
            expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
            expect(mockClearSelection).toHaveBeenCalled();
        });

        it('should preventDefault on Delete to block browser default behavior', () => {
            const selectedNodeIds = new Set(['node-1']);
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = { selectedNodeIds, deleteNode: mockDeleteNode, clearSelection: mockClearSelection };
                    return selector ? selector(state) : state;
                }
            );
            renderHook(() => useKeyboardShortcuts({}));
            const event = fireKeyDown('Delete');
            expect(event.defaultPrevented).toBe(true);
        });

        it('should preventDefault on Backspace to block browser-back navigation', () => {
            const selectedNodeIds = new Set(['node-1']);
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = { selectedNodeIds, deleteNode: mockDeleteNode, clearSelection: mockClearSelection };
                    return selector ? selector(state) : state;
                }
            );
            renderHook(() => useKeyboardShortcuts({}));
            const event = fireKeyDown('Backspace');
            expect(event.defaultPrevented).toBe(true);
        });
    });

    describe('Clear Selection (Escape)', () => {
        it('should clear selection when Escape is pressed', () => {
            renderHook(() => useKeyboardShortcuts({}));
            fireKeyDown('Escape');
            expect(mockClearSelection).toHaveBeenCalledTimes(1);
        });
    });

    describe('Add Node (N key)', () => {
        it('should call onAddNode when N is pressed', () => {
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            fireKeyDown('n');
            expect(mockOnAddNode).toHaveBeenCalledTimes(1);
        });

        it('should call onAddNode when uppercase N is pressed', () => {
            renderHook(() => useKeyboardShortcuts({ onAddNode: mockOnAddNode }));
            fireKeyDown('N');
            expect(mockOnAddNode).toHaveBeenCalledTimes(1);
        });

        it('should not call onAddNode if callback not provided', () => {
            renderHook(() => useKeyboardShortcuts({}));
            expect(() => fireKeyDown('n')).not.toThrow();
        });
    });

    describe('Quick Capture (Cmd/Ctrl + N)', () => {
        it('should call onQuickCapture when Cmd+N is pressed', () => {
            renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
            fireKeyDown('n', { metaKey: true });
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        });

        it('should call onQuickCapture when Ctrl+N is pressed', () => {
            renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
            fireKeyDown('n', { ctrlKey: true });
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        });

        it('should not call onAddNode when Cmd+N is pressed (separate action)', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onAddNode: mockOnAddNode, onQuickCapture: mockOnQuickCapture })
            );
            fireKeyDown('n', { metaKey: true });
            expect(mockOnAddNode).not.toHaveBeenCalled();
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        });

        it('should still work in input fields (for quick capture)', () => {
            renderHook(() => useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture }));
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();
            const event = new KeyboardEvent('keydown', {
                key: 'n', metaKey: true, bubbles: true, cancelable: true,
            });
            Object.defineProperty(event, 'target', { value: input });
            document.dispatchEvent(event);
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
            document.body.removeChild(input);
        });
    });

    describe('Cleanup', () => {
        it('should remove event listener from document on unmount', () => {
            const removeSpy = vi.spyOn(document, 'removeEventListener');
            const { unmount } = renderHook(() => useKeyboardShortcuts({}));
            unmount();
            expect(removeSpy).toHaveBeenCalledWith(
                'keydown', expect.any(Function), { capture: true },
            );
        });
    });
});
