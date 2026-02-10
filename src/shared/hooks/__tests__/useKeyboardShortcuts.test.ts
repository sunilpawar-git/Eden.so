/**
 * useKeyboardShortcuts Hook Tests
 * TDD: Tests for global keyboard shortcuts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';

// Mock the canvas store
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

    const fireKeyDown = (key: string, options: Partial<KeyboardEvent> = {}) => {
        const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            ...options,
        });
        window.dispatchEvent(event);
        return event;
    };

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
                    const state = {
                        selectedNodeIds,
                        deleteNode: mockDeleteNode,
                        clearSelection: mockClearSelection,
                    };
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
                    const state = {
                        selectedNodeIds,
                        deleteNode: mockDeleteNode,
                        clearSelection: mockClearSelection,
                    };
                    return selector ? selector(state) : state;
                }
            );

            renderHook(() => useKeyboardShortcuts({}));

            fireKeyDown('Backspace');

            expect(mockDeleteNode).toHaveBeenCalledWith('node-1');
            expect(mockClearSelection).toHaveBeenCalled();
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
            renderHook(() =>
                useKeyboardShortcuts({ onAddNode: mockOnAddNode })
            );

            fireKeyDown('n');
            expect(mockOnAddNode).toHaveBeenCalledTimes(1);
        });

        it('should call onAddNode when uppercase N is pressed', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onAddNode: mockOnAddNode })
            );

            fireKeyDown('N');
            expect(mockOnAddNode).toHaveBeenCalledTimes(1);
        });

        it('should not call onAddNode if callback not provided', () => {
            renderHook(() => useKeyboardShortcuts({}));

            // Should not throw
            expect(() => fireKeyDown('n')).not.toThrow();
        });
    });

    describe('Input Focus Handling', () => {
        it('should not trigger shortcuts when store.editingNodeId is set', () => {
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = {
                        selectedNodeIds: new Set<string>(),
                        deleteNode: mockDeleteNode,
                        clearSelection: mockClearSelection,
                        editingNodeId: 'node-42',
                    };
                    return selector ? selector(state) : state;
                }
            );

            renderHook(() =>
                useKeyboardShortcuts({ onAddNode: mockOnAddNode })
            );

            fireKeyDown('n');
            expect(mockOnAddNode).not.toHaveBeenCalled();
        });

        it('should not intercept Delete/Backspace when editingNodeId is set', () => {
            const selectedNodeIds = new Set(['node-1']);
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = {
                        selectedNodeIds,
                        deleteNode: mockDeleteNode,
                        clearSelection: mockClearSelection,
                        editingNodeId: 'node-1',
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
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = {
                        selectedNodeIds: new Set<string>(),
                        deleteNode: mockDeleteNode,
                        clearSelection: mockClearSelection,
                        editingNodeId: 'node-5',
                    };
                    return selector ? selector(state) : state;
                }
            );

            renderHook(() => useKeyboardShortcuts({}));

            fireKeyDown('Escape');
            expect(mockClearSelection).not.toHaveBeenCalled();
        });

        it('should still trigger Cmd+N when editingNodeId is set', () => {
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = {
                        selectedNodeIds: new Set<string>(),
                        deleteNode: mockDeleteNode,
                        clearSelection: mockClearSelection,
                        editingNodeId: 'node-42',
                    };
                    return selector ? selector(state) : state;
                }
            );

            renderHook(() =>
                useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture })
            );

            fireKeyDown('n', { metaKey: true });
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        });

        it('should still trigger Cmd+, when editingNodeId is set', () => {
            (useCanvasStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
                (selector?: (state: unknown) => unknown) => {
                    const state = {
                        selectedNodeIds: new Set<string>(),
                        deleteNode: mockDeleteNode,
                        clearSelection: mockClearSelection,
                        editingNodeId: 'node-42',
                    };
                    return selector ? selector(state) : state;
                }
            );

            renderHook(() =>
                useKeyboardShortcuts({ onOpenSettings: mockOnOpenSettings })
            );

            fireKeyDown(',', { metaKey: true });
            expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
        });

        it('should fire shortcuts normally when editingNodeId is null', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onAddNode: mockOnAddNode })
            );

            fireKeyDown('n');
            expect(mockOnAddNode).toHaveBeenCalledTimes(1);
        });

        it('should not trigger shortcuts when typing in input (legacy DOM guard)', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onAddNode: mockOnAddNode })
            );

            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            const event = new KeyboardEvent('keydown', {
                key: 'n',
                bubbles: true,
            });
            Object.defineProperty(event, 'target', { value: input });
            window.dispatchEvent(event);

            expect(mockOnAddNode).not.toHaveBeenCalled();
            document.body.removeChild(input);
        });

        it('should not trigger shortcuts when typing in textarea', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onAddNode: mockOnAddNode })
            );

            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            textarea.focus();

            const event = new KeyboardEvent('keydown', {
                key: 'n',
                bubbles: true,
            });
            Object.defineProperty(event, 'target', { value: textarea });
            window.dispatchEvent(event);

            expect(mockOnAddNode).not.toHaveBeenCalled();
            document.body.removeChild(textarea);
        });

        it('should not trigger shortcuts when typing in contenteditable', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onAddNode: mockOnAddNode })
            );

            const div = document.createElement('div');
            div.contentEditable = 'true';
            document.body.appendChild(div);
            div.focus();

            // Dispatch from the element itself so target is correct
            const event = new KeyboardEvent('keydown', {
                key: 'n',
                bubbles: true,
            });
            div.dispatchEvent(event);

            expect(mockOnAddNode).not.toHaveBeenCalled();
            document.body.removeChild(div);
        });
    });

    describe('Quick Capture (Cmd/Ctrl + N)', () => {
        it('should call onQuickCapture when Cmd+N is pressed', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture })
            );

            fireKeyDown('n', { metaKey: true });
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        });

        it('should call onQuickCapture when Ctrl+N is pressed', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture })
            );

            fireKeyDown('n', { ctrlKey: true });
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        });

        it('should not call onAddNode when Cmd+N is pressed (separate action)', () => {
            renderHook(() =>
                useKeyboardShortcuts({ 
                    onAddNode: mockOnAddNode,
                    onQuickCapture: mockOnQuickCapture 
                })
            );

            fireKeyDown('n', { metaKey: true });
            expect(mockOnAddNode).not.toHaveBeenCalled();
            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
        });

        it('should still work in input fields (for quick capture)', () => {
            renderHook(() =>
                useKeyboardShortcuts({ onQuickCapture: mockOnQuickCapture })
            );

            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            // Cmd+N should still work even in input (it's a system shortcut)
            const event = new KeyboardEvent('keydown', {
                key: 'n',
                metaKey: true,
                bubbles: true,
            });
            Object.defineProperty(event, 'target', { value: input });
            window.dispatchEvent(event);

            expect(mockOnQuickCapture).toHaveBeenCalledTimes(1);
            document.body.removeChild(input);
        });
    });

    describe('Cleanup', () => {
        it('should remove event listener on unmount', () => {
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() => useKeyboardShortcuts({}));
            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'keydown',
                expect.any(Function)
            );
        });
    });
});
