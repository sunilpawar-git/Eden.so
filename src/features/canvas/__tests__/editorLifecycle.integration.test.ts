/**
 * Integration tests for editor lifecycle, state machine, and cleanup.
 * Split from editorPipeline.integration.test.ts to stay under 300-line limit.
 *
 * Covers: blurRef stale closure, editable toggle, output sync,
 * submitHandlerRef cleanup, store state machine, delete-while-editing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCanvasStore } from '../stores/canvasStore';

// ---------------------------------------------------------------------------
// 7. blurRef stale closure prevention
// ---------------------------------------------------------------------------

describe('blurRef stale closure prevention', () => {
    it('blur uses the latest output value after props change (not stale closure)', async () => {
        const { useIdeaCardEditor } = await import('../hooks/useIdeaCardEditor');

        const saveContent = vi.fn();
        const onExitEditing = vi.fn();

        const initialProps = {
            isEditing: true,
            output: 'version-1' as string | undefined,
            getEditableContent: () => 'editable content',
            placeholder: 'Type...',
            saveContent,
            onExitEditing,
        };

        const { rerender } = renderHook(
            (props) => useIdeaCardEditor(props),
            { initialProps },
        );

        act(() => {
            rerender({ ...initialProps, output: 'version-2' });
        });

        expect(saveContent).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// 8. Editor editable toggle during edit lifecycle
// ---------------------------------------------------------------------------

describe('Editor editable toggle (real TipTap)', () => {
    it('editor starts non-editable, becomes editable via setEditable, then back', () => {
        const { result } = renderHook(() =>
            useEditor({
                extensions: [StarterKit],
                content: '<p>read only</p>',
                editable: false,
            }),
        );
        const editor = result.current;
        expect(editor).not.toBeNull();
        expect(editor!.isEditable).toBe(false);

        act(() => { editor!.setEditable(true); });
        expect(editor!.isEditable).toBe(true);

        act(() => {
            const { state, dispatch } = editor!.view;
            dispatch(state.tr.insertText(' more'));
        });
        expect(editor!.getText()).toContain('more');

        act(() => { editor!.setEditable(false); });
        expect(editor!.isEditable).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 9. Content output sync: editor updates when output changes while NOT editing
// ---------------------------------------------------------------------------

describe('Output sync to editor (real TipTap)', () => {
    it('editor content updates when output prop changes while not editing', async () => {
        const { useIdeaCardEditor } = await import('../hooks/useIdeaCardEditor');

        const initialProps = {
            isEditing: false,
            output: 'initial text' as string | undefined,
            getEditableContent: () => '',
            placeholder: 'Type...',
            saveContent: vi.fn(),
            onExitEditing: vi.fn(),
        };

        const { result, rerender } = renderHook(
            (props) => useIdeaCardEditor(props),
            { initialProps },
        );

        act(() => {
            rerender({ ...initialProps, output: 'updated by AI' });
        });

        const md = result.current.getMarkdown();
        expect(md).toContain('updated by AI');
    });

    it('editor content does NOT update when output changes while editing', async () => {
        const { useIdeaCardEditor } = await import('../hooks/useIdeaCardEditor');

        const initialProps = {
            isEditing: true,
            output: 'initial' as string | undefined,
            getEditableContent: () => 'user typing...',
            placeholder: 'Type...',
            saveContent: vi.fn(),
            onExitEditing: vi.fn(),
        };

        const { result, rerender } = renderHook(
            (props) => useIdeaCardEditor(props),
            { initialProps },
        );

        act(() => {
            rerender({ ...initialProps, output: 'changed externally' });
        });

        const md = result.current.getMarkdown();
        expect(md).not.toContain('changed externally');
    });
});

// ---------------------------------------------------------------------------
// 10. submitHandlerRef cleanup on unmount
// ---------------------------------------------------------------------------

describe('submitHandlerRef cleanup on unmount', () => {
    it('submitHandlerRef is set to null after useNodeInput unmounts', async () => {
        const { useNodeInput } = await import('../hooks/useNodeInput');

        const submitHandlerRef = { current: null as import('../extensions/submitKeymap').SubmitKeymapHandler | null };
        const mockEditor = {
            setEditable: vi.fn(),
            commands: { focus: vi.fn() },
            view: {
                dom: document.createElement('div'),
                state: { selection: { from: 0, to: 0 } },
            },
        } as unknown as import('@tiptap/react').Editor;

        useCanvasStore.getState().startEditing('unmount-test');

        const { unmount } = renderHook(() =>
            useNodeInput({
                nodeId: 'unmount-test',
                editor: mockEditor,
                getMarkdown: () => '',
                setContent: vi.fn(),
                getEditableContent: () => '',
                saveContent: vi.fn(),
                submitHandlerRef,
                isGenerating: false,
                isNewEmptyNode: false,
                isEditing: true,
            }),
        );

        expect(submitHandlerRef.current).not.toBeNull();
        expect(submitHandlerRef.current!.onEnter).toBeDefined();
        expect(submitHandlerRef.current!.onEscape).toBeDefined();

        unmount();

        expect(submitHandlerRef.current).toBeNull();

        useCanvasStore.getState().stopEditing();
    });
});

// ---------------------------------------------------------------------------
// 11. Store state machine: full editing lifecycle
// ---------------------------------------------------------------------------

describe('Store editing lifecycle state machine', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    it('full lifecycle: idle → editing → draft updates → AI mode → submit → idle', () => {
        const store = useCanvasStore.getState;

        expect(store().editingNodeId).toBeNull();
        expect(store().inputMode).toBe('note');
        expect(store().draftContent).toBeNull();

        store().startEditing('lifecycle-node');
        expect(store().editingNodeId).toBe('lifecycle-node');
        expect(store().inputMode).toBe('note');
        expect(store().draftContent).toBeNull();

        store().updateDraft('hello world');
        expect(store().draftContent).toBe('hello world');

        store().setInputMode('ai');
        expect(store().inputMode).toBe('ai');

        store().updateDraft('explain quantum computing');
        expect(store().draftContent).toBe('explain quantum computing');

        store().stopEditing();
        expect(store().editingNodeId).toBeNull();
        expect(store().inputMode).toBe('note');
        expect(store().draftContent).toBeNull();
    });

    it('switching to a new node auto-stops the previous edit', () => {
        const store = useCanvasStore.getState;

        store().startEditing('node-A');
        store().setInputMode('ai');
        store().updateDraft('prompt for A');

        store().startEditing('node-B');
        expect(store().editingNodeId).toBe('node-B');
        expect(store().inputMode).toBe('note');
        expect(store().draftContent).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// 12. Delete node while editing — cleanup
// ---------------------------------------------------------------------------

describe('Delete node while editing — state cleanup', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    it('deleting the currently-edited node resets all editing state', () => {
        const store = useCanvasStore.getState;

        store().setNodes([{
            id: 'delete-me',
            type: 'idea',
            position: { x: 0, y: 0 },
            data: { content: 'to be deleted', type: 'note', prompt: '' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any]);

        store().startEditing('delete-me');
        store().setInputMode('ai');
        store().updateDraft('in-progress prompt');

        expect(store().editingNodeId).toBe('delete-me');

        store().deleteNode('delete-me');

        expect(store().editingNodeId).toBeNull();
        expect(store().inputMode).toBe('note');
        expect(store().draftContent).toBeNull();
    });

    it('deleting a non-edited node does NOT reset editing state', () => {
        const store = useCanvasStore.getState;

        store().setNodes([
            { id: 'editing', type: 'idea', position: { x: 0, y: 0 }, data: { content: 'editing', type: 'note', prompt: '' } },
            { id: 'other', type: 'idea', position: { x: 100, y: 0 }, data: { content: 'other', type: 'note', prompt: '' } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any);

        store().startEditing('editing');
        store().updateDraft('my draft');

        store().deleteNode('other');

        expect(store().editingNodeId).toBe('editing');
        expect(store().draftContent).toBe('my draft');
    });
});
