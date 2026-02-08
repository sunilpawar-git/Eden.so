/**
 * useIdeaCardKeyboard Tests
 * TDD: Validates keyboard shortcuts and view-mode content interaction
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useIdeaCardKeyboard } from '../useIdeaCardKeyboard';

const defaultOptions = () => ({
    editor: {
        view: { dom: document.createElement('div') },
        commands: { insertContent: vi.fn() },
    } as unknown as Parameters<typeof useIdeaCardKeyboard>[0]['editor'],
    isEditing: true,
    isGenerating: false,
    inputMode: 'note' as const,
    getMarkdown: vi.fn(() => 'test content'),
    setContent: vi.fn(),
    getEditableContent: vi.fn(() => 'existing content'),
    suggestionActiveRef: { current: false },
    saveContent: vi.fn(),
    onExitEditing: vi.fn(),
    onEnterEditing: vi.fn(),
    onSubmitNote: vi.fn(),
    onSubmitAI: vi.fn(),
});

describe('useIdeaCardKeyboard', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    describe('handleContentDoubleClick', () => {
        it('calls onEnterEditing when not generating', () => {
            const opts = { ...defaultOptions(), isEditing: false, isGenerating: false };
            const { result } = renderHook(() => useIdeaCardKeyboard(opts));

            act(() => { result.current.handleContentDoubleClick(); });
            expect(opts.onEnterEditing).toHaveBeenCalled();
            expect(opts.setContent).toHaveBeenCalledWith('existing content');
        });

        it('does nothing when generating', () => {
            const opts = { ...defaultOptions(), isEditing: false, isGenerating: true };
            const { result } = renderHook(() => useIdeaCardKeyboard(opts));

            act(() => { result.current.handleContentDoubleClick(); });
            expect(opts.onEnterEditing).not.toHaveBeenCalled();
        });
    });

    describe('handleContentKeyDown', () => {
        it('calls onEnterEditing on Enter key', () => {
            const opts = { ...defaultOptions(), isEditing: false };
            const { result } = renderHook(() => useIdeaCardKeyboard(opts));

            const event = { key: 'Enter', preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
            act(() => { result.current.handleContentKeyDown(event); });
            expect(opts.onEnterEditing).toHaveBeenCalled();
        });

        it('inserts printable character when entering edit mode', () => {
            const opts = { ...defaultOptions(), isEditing: false };
            const { result } = renderHook(() => useIdeaCardKeyboard(opts));

            const event = {
                key: 'a', preventDefault: vi.fn(),
                ctrlKey: false, metaKey: false, altKey: false,
            } as unknown as React.KeyboardEvent;
            act(() => { result.current.handleContentKeyDown(event); });
            expect(opts.onEnterEditing).toHaveBeenCalled();
        });

        it('ignores when generating', () => {
            const opts = { ...defaultOptions(), isEditing: false, isGenerating: true };
            const { result } = renderHook(() => useIdeaCardKeyboard(opts));

            const event = { key: 'a', preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
            act(() => { result.current.handleContentKeyDown(event); });
            expect(opts.onEnterEditing).not.toHaveBeenCalled();
        });
    });

    describe('editor keydown effect', () => {
        it('attaches keydown listener when editing', () => {
            const opts = defaultOptions();
            const addSpy = vi.spyOn(opts.editor!.view.dom, 'addEventListener');
            renderHook(() => useIdeaCardKeyboard(opts));

            expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        it('does not attach when not editing', () => {
            const opts = { ...defaultOptions(), isEditing: false };
            const addSpy = vi.spyOn(opts.editor!.view.dom, 'addEventListener');
            renderHook(() => useIdeaCardKeyboard(opts));

            expect(addSpy).not.toHaveBeenCalled();
        });
    });
});
