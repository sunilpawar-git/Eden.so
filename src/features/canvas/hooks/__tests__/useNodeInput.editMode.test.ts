/**
 * useNodeInput Edit Mode Tests
 * Tests for edit-mode keyboard handling and editor editable state management.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeInput, type UseNodeInputOptions } from '../useNodeInput';
import { NODE_ID, createMockNode, createMockEditor, buildBaseOpts } from './nodeInputTestHelpers';

vi.mock('../useLinkPreviewFetch', () => ({ useLinkPreviewFetch: vi.fn() }));

describe('useNodeInput edit-mode', () => {
    let mockEditor: ReturnType<typeof createMockEditor>;
    const baseOpts = (overrides: Partial<UseNodeInputOptions> = {}) =>
        buildBaseOpts(mockEditor, overrides);

    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.getState().clearCanvas();
        useCanvasStore.getState().addNode(createMockNode(NODE_ID));
        mockEditor = createMockEditor();
    });

    afterEach(() => { vi.restoreAllMocks(); });

    const renderInEditMode = (overrides: Partial<UseNodeInputOptions> = {}) => {
        useCanvasStore.getState().startEditing(NODE_ID);
        const opts = baseOpts({ getMarkdown: vi.fn(() => 'draft content'), ...overrides });
        return { ...renderHook(() => useNodeInput(opts)), opts };
    };

    describe('edit-mode keyboard handling', () => {
        it('Escape saves content and stops editing', () => {
            const { opts } = renderInEditMode();
            expect(opts.submitHandlerRef.current).not.toBeNull();
            act(() => { (opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler).onEscape(); });
            expect(opts.saveContent).toHaveBeenCalledWith('draft content');
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('Enter returns false to allow new paragraph creation', () => {
            const { opts } = renderInEditMode();
            expect(opts.submitHandlerRef.current).not.toBeNull();
            const handler = opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler;
            let result: boolean;
            act(() => { result = handler.onEnter(); });
            expect(result!).toBe(false);
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('Enter returns false regardless of inputMode', () => {
            const { opts } = renderInEditMode();
            act(() => { useCanvasStore.getState().setInputMode('ai'); });
            expect(opts.submitHandlerRef.current).not.toBeNull();
            const handler = opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler;
            let result: boolean;
            act(() => { result = handler.onEnter(); });
            expect(result!).toBe(false);
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('Enter with empty content still returns false (allows new paragraph)', () => {
            const { opts } = renderInEditMode({ getMarkdown: vi.fn(() => '   ') });
            expect(opts.submitHandlerRef.current).not.toBeNull();
            const handler = opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler;
            let result: boolean;
            act(() => { result = handler.onEnter(); });
            expect(result!).toBe(false);
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });

        it('Escape still saves content and stops editing (notepad exit)', () => {
            const { opts } = renderInEditMode();
            expect(opts.submitHandlerRef.current).not.toBeNull();
            const handler = opts.submitHandlerRef.current as unknown as import('../../../canvas/extensions/submitKeymap').SubmitKeymapHandler;
            act(() => { handler.onEscape(); });
            expect(opts.saveContent).toHaveBeenCalledWith('draft content');
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('Shift+Enter does not exit editing (allows newline)', () => {
            renderInEditMode();
            expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
        });
    });

    describe('editor editable state management', () => {
        it('sets editor editable to false on exitEditing (Escape)', () => {
            useCanvasStore.getState().startEditing(NODE_ID);
            const submitHandlerRef = { current: null as import('../../extensions/submitKeymap').SubmitKeymapHandler | null };
            renderHook(() => useNodeInput(baseOpts({
                getMarkdown: vi.fn(() => 'content'),
                getEditableContent: vi.fn(() => ''),
                submitHandlerRef,
            })));
            expect(submitHandlerRef.current).not.toBeNull();
            act(() => { submitHandlerRef.current!.onEscape(); });
            expect(mockEditor.setEditable).toHaveBeenCalledWith(false);
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('sets editor editable to true on enterEditing', () => {
            const { result } = renderHook(() => useNodeInput(baseOpts({
                getEditableContent: vi.fn(() => ''),
            })));
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
            Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
            act(() => { result.current.handleKeyDown(event); });
            expect(mockEditor.setEditable).toHaveBeenCalledWith(true);
        });
    });
});
