/**
 * useIdeaCardEditor Tests
 * TDD: Validates editor lifecycle, blur handling, and content sync.
 * Slash commands live in the heading editor only (useHeadingEditor).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdeaCardEditor } from '../useIdeaCardEditor';

// Mock useTipTapEditor
const mockSetContent = vi.fn();
const mockGetMarkdown = vi.fn(() => '');
const mockEditor = { view: { dom: document.createElement('div') }, isEmpty: true };

vi.mock('../useTipTapEditor', () => ({
    useTipTapEditor: (opts: { onBlur?: (md: string) => void }) => {
        // Store onBlur so tests can trigger it
        latestOnBlur = opts.onBlur ?? null;
        return {
            editor: mockEditor,
            getMarkdown: mockGetMarkdown,
            getText: vi.fn(() => ''),
            isEmpty: true,
            setContent: mockSetContent,
        };
    },
}));

let latestOnBlur: ((md: string) => void) | null = null;

const defaultOptions = () => ({
    isEditing: false,
    output: undefined as string | undefined,
    getEditableContent: () => '',
    placeholder: 'Type something...',
    saveContent: vi.fn(),
    onExitEditing: vi.fn(),
});

describe('useIdeaCardEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        latestOnBlur = null;
    });

    it('returns editor, getMarkdown, setContent, submitHandlerRef', () => {
        const { result } = renderHook(() => useIdeaCardEditor(defaultOptions()));
        expect(result.current.editor).toBeDefined();
        expect(result.current.getMarkdown).toBeDefined();
        expect(result.current.setContent).toBeDefined();
        expect(result.current.submitHandlerRef).toBeDefined();
    });

    describe('blur handling', () => {
        it('calls saveContent and onExitEditing on blur', () => {
            const opts = defaultOptions();
            renderHook(() => useIdeaCardEditor(opts));

            act(() => { latestOnBlur?.('saved text'); });
            expect(opts.saveContent).toHaveBeenCalledWith('saved text');
            expect(opts.onExitEditing).toHaveBeenCalled();
        });

        it('sets editor content to the saved markdown, not stale output', () => {
            const opts = { ...defaultOptions(), output: 'old content', isEditing: true };
            renderHook(() => useIdeaCardEditor(opts));

            act(() => { latestOnBlur?.('new content'); });
            expect(mockSetContent).toHaveBeenCalledWith('new content');
            expect(mockSetContent).not.toHaveBeenCalledWith('old content');
        });
    });

    describe('output sync', () => {
        it('syncs editor content when output changes while not editing', () => {
            const opts = defaultOptions();
            opts.output = 'initial';
            const { rerender } = renderHook(
                (props) => useIdeaCardEditor(props),
                { initialProps: opts },
            );

            const updatedOpts = { ...opts, output: 'updated' };
            rerender(updatedOpts);
            expect(mockSetContent).toHaveBeenCalledWith('updated');
        });

        it('does not sync when editing', () => {
            const opts = { ...defaultOptions(), isEditing: true, output: 'initial' };
            const { rerender } = renderHook(
                (props) => useIdeaCardEditor(props),
                { initialProps: opts },
            );

            rerender({ ...opts, output: 'updated' });
            expect(mockSetContent).not.toHaveBeenCalled();
        });

        it('pushes content into editor when transitioning to editing mode', () => {
            const content = '- Walong\n- KAziranga\n- Cab';
            const opts = { ...defaultOptions(), isEditing: false, output: content, getEditableContent: () => content };
            const { rerender } = renderHook(
                (props) => useIdeaCardEditor(props),
                { initialProps: opts },
            );

            mockSetContent.mockClear();
            rerender({ ...opts, isEditing: true });
            expect(mockSetContent).toHaveBeenCalledWith(content);
        });

        it('does NOT push content when already in editing mode', () => {
            const opts = { ...defaultOptions(), isEditing: true, output: 'content', getEditableContent: () => 'content' };
            const { rerender } = renderHook(
                (props) => useIdeaCardEditor(props),
                { initialProps: opts },
            );

            mockSetContent.mockClear();
            rerender({ ...opts, output: 'content2', getEditableContent: () => 'content2' });
            expect(mockSetContent).not.toHaveBeenCalled();
        });
    });
});
