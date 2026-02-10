/**
 * useIdeaCardEditor Tests
 * TDD: Validates editor lifecycle, blur guard, and content sync
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

// Mock slash command extension
vi.mock('../../extensions/slashCommandSuggestion', () => ({
    SlashCommandSuggestion: { configure: () => ({}) },
    createSlashSuggestionRender: () => () => ({}),
}));

let latestOnBlur: ((md: string) => void) | null = null;

const defaultOptions = () => ({
    isEditing: false,
    output: undefined as string | undefined,
    getEditableContent: () => '',
    placeholder: 'Type something...',
    saveContent: vi.fn(),
    onExitEditing: vi.fn(),
    onSlashCommand: vi.fn(),
});

describe('useIdeaCardEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        latestOnBlur = null;
    });

    it('returns editor, getMarkdown, setContent, suggestionActiveRef', () => {
        const { result } = renderHook(() => useIdeaCardEditor(defaultOptions()));
        expect(result.current.editor).toBeDefined();
        expect(result.current.getMarkdown).toBeDefined();
        expect(result.current.setContent).toBeDefined();
        expect(result.current.suggestionActiveRef).toBeDefined();
    });

    it('returns suggestionActiveRef', () => {
        const { result } = renderHook(() => useIdeaCardEditor(defaultOptions()));
        expect(result.current.suggestionActiveRef).toBeDefined();
        expect(result.current.suggestionActiveRef.current).toBe(false);
    });

    describe('blur handling', () => {
        it('calls saveContent and onExitEditing on blur', () => {
            const opts = defaultOptions();
            renderHook(() => useIdeaCardEditor(opts));

            act(() => { latestOnBlur?.('saved text'); });
            expect(opts.saveContent).toHaveBeenCalledWith('saved text');
            expect(opts.onExitEditing).toHaveBeenCalled();
        });

        it('skips blur when suggestion is active', () => {
            const opts = defaultOptions();
            const { result } = renderHook(() => useIdeaCardEditor(opts));

            // Simulate suggestion popup being active
            (result.current.suggestionActiveRef as { current: boolean }).current = true;
            act(() => { latestOnBlur?.('should not save'); });
            expect(opts.saveContent).not.toHaveBeenCalled();
            expect(opts.onExitEditing).not.toHaveBeenCalled();
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
    });
});
