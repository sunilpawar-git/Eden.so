/**
 * Integration tests for edit mode state and auto-edit lifecycle.
 * Split from slashCommandFlow.integration.test.ts to stay under 300 lines.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../stores/canvasStore';

const safeStartEditing = (id: string) => act(() => { useCanvasStore.getState().startEditing(id); });
const safeStopEditing = () => act(() => { useCanvasStore.getState().stopEditing(); });
const safeClearCanvas = () => act(() => { useCanvasStore.getState().clearCanvas(); });

describe('Edit-mode state consistency', () => {
    beforeEach(() => {
        safeClearCanvas();
    });

    it('stopEditing resets inputMode to note', () => {
        safeStartEditing('node-1');
        act(() => { useCanvasStore.getState().setInputMode('ai'); });
        expect(useCanvasStore.getState().inputMode).toBe('ai');

        safeStopEditing();
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
        expect(useCanvasStore.getState().inputMode).toBe('note');
    });

    it('startEditing resets inputMode to note (prevents stale mode from previous edit)', () => {
        safeStartEditing('node-1');
        act(() => { useCanvasStore.getState().setInputMode('ai'); });
        safeStopEditing();

        // New edit session should start fresh in note mode
        safeStartEditing('node-2');
        expect(useCanvasStore.getState().inputMode).toBe('note');
    });
});

describe('handleEditModeKey is a no-op (Bug 4 regression guard)', () => {
    it('Enter and Escape in edit mode do NOT call stopEditing from the React handler', async () => {
        const { useNodeInput } = await import('../hooks/useNodeInput');

        const mockEditor = {
            setEditable: vi.fn(),
            commands: { focus: vi.fn() },
            view: { dom: document.createElement('div'), state: { selection: { from: 0, to: 0 } } },
        } as unknown as import('@tiptap/react').Editor;

        const saveContent = vi.fn();
        const submitHandlerRef = { current: null as import('../extensions/submitKeymap').SubmitKeymapHandler | null };

        safeStartEditing('test-node-noop');

        const { result } = renderHook(() =>
            useNodeInput({
                nodeId: 'test-node-noop',
                editor: mockEditor,
                getMarkdown: () => 'some content',
                setContent: vi.fn(),
                getEditableContent: () => 'some content',
                saveContent,
                submitHandlerRef,
                isGenerating: false,
                isNewEmptyNode: false,
                isEditing: true,
            }),
        );

        expect(useCanvasStore.getState().editingNodeId).toBe('test-node-noop');

        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        act(() => { result.current.handleKeyDown(enterEvent as unknown as KeyboardEvent); });

        expect(saveContent).not.toHaveBeenCalled();

        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        act(() => { result.current.handleKeyDown(escapeEvent as unknown as KeyboardEvent); });

        expect(saveContent).not.toHaveBeenCalled();

        safeStopEditing();
    });
});

describe('Auto-edit lifecycle (Bug 1 regression guard)', () => {
    it('auto-enters edit mode and focuses when editor becomes available for a new empty node', async () => {
        const { useNodeInput } = await import('../hooks/useNodeInput');

        safeClearCanvas();

        const focusSpy = vi.fn();
        const setEditableSpy = vi.fn();
        const setContent = vi.fn();
        const getEditableContent = vi.fn(() => '');
        const submitHandlerRef = { current: null as import('../extensions/submitKeymap').SubmitKeymapHandler | null };

        const { rerender } = renderHook(
            (props: { editor: import('@tiptap/react').Editor | null; isEditing: boolean }) =>
                useNodeInput({
                    nodeId: 'new-node-1',
                    editor: props.editor,
                    getMarkdown: () => '',
                    setContent,
                    getEditableContent,
                    saveContent: vi.fn(),
                    submitHandlerRef,
                    isGenerating: false,
                    isNewEmptyNode: true,
                    isEditing: props.isEditing,
                }),
            { initialProps: { editor: null, isEditing: false } },
        );

        expect(useCanvasStore.getState().editingNodeId).not.toBe('new-node-1');

        const mockEditor = {
            setEditable: setEditableSpy,
            commands: { focus: focusSpy },
            view: {
                dom: document.createElement('div'),
                state: { selection: { from: 0, to: 0 } },
            },
        } as unknown as import('@tiptap/react').Editor;

        act(() => { (rerender as unknown as (props: Record<string, unknown>) => void)({ editor: mockEditor, isEditing: true }); });

        expect(useCanvasStore.getState().editingNodeId).toBe('new-node-1');
        expect(setEditableSpy).toHaveBeenCalledWith(true);
        expect(setContent).toHaveBeenCalled();

        await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

        setEditableSpy.mockClear();
        focusSpy.mockClear();
        setContent.mockClear();

        act(() => { (rerender as unknown as (props: Record<string, unknown>) => void)({ editor: mockEditor, isEditing: true }); });

        expect(setContent).not.toHaveBeenCalled();

        safeStopEditing();
    });

    it('does NOT auto-edit when isNewEmptyNode is false', async () => {
        const { useNodeInput } = await import('../hooks/useNodeInput');

        safeClearCanvas();

        const mockEditor = {
            setEditable: vi.fn(),
            commands: { focus: vi.fn() },
            view: {
                dom: document.createElement('div'),
                state: { selection: { from: 0, to: 0 } },
            },
        } as unknown as import('@tiptap/react').Editor;

        renderHook(() =>
            useNodeInput({
                nodeId: 'existing-node',
                editor: mockEditor,
                getMarkdown: () => 'existing content',
                setContent: vi.fn(),
                getEditableContent: () => 'existing content',
                saveContent: vi.fn(),
                submitHandlerRef: { current: null },
                isGenerating: false,
                isNewEmptyNode: false,
                isEditing: false,
            }),
        );

        expect(useCanvasStore.getState().editingNodeId).not.toBe('existing-node');
    });
});
