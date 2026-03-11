/**
 * useHeadingEditor — Behavioral content-sync tests with real TipTap editors.
 *
 * Scenario: focus mode updates heading in the store → IdeaCard's heading prop
 * changes while isEditing=false → the heading TipTap editor must display the
 * new heading, not the stale initialContent.
 *
 * These tests create real TipTap editor instances (via renderHook) to verify
 * the content-sync effect works at runtime, not just structurally.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Extension } from '@tiptap/core';
import { useHeadingEditor } from '../useHeadingEditor';

// Create a no-op TipTap extension so the editor initialises without crashing
// in jsdom (the real SlashCommandSuggestion depends on DOM positioning).
const noopExtension = Extension.create({ name: 'slashCommandSuggestion' });

vi.mock('../../extensions/slashCommandSuggestion', () => ({
    SlashCommandSuggestion: {
        configure: () => noopExtension,
    },
    createSlashSuggestionRender: () => () => ({}),
}));

function createHookProps(overrides?: Partial<Parameters<typeof useHeadingEditor>[0]>) {
    return {
        heading: 'Original Heading',
        placeholder: 'Title…',
        isEditing: false,
        onHeadingChange: vi.fn(),
        onBlur: vi.fn(),
        onEnterKey: vi.fn(),
        ...overrides,
    };
}

describe('useHeadingEditor — content sync (behavioral)', () => {
    it('editor initialises with the heading content', () => {
        const { result } = renderHook(() =>
            useHeadingEditor(createHookProps({ heading: 'Hello World' })),
        );
        expect(result.current.getHeading()).toBe('Hello World');
    });

    it('syncs editor content when heading prop changes while NOT editing', async () => {
        const { result, rerender } = renderHook(
            (props) => useHeadingEditor(props),
            { initialProps: createHookProps({ heading: 'Node 1', isEditing: false }) },
        );
        expect(result.current.getHeading()).toBe('Node 1');

        // Simulate: focus mode committed "Node 1 + Node 2" to the store.
        // The IdeaCard re-renders with the new heading while isEditing=false.
        rerender(createHookProps({ heading: 'Node 1 + Node 2', isEditing: false }));
        await act(async () => {}); // flush effects

        expect(result.current.getHeading()).toBe('Node 1 + Node 2');
    });

    it('does NOT overwrite editor content when heading prop changes while editing', async () => {
        const { result, rerender } = renderHook(
            (props) => useHeadingEditor(props),
            { initialProps: createHookProps({ heading: 'Original', isEditing: true }) },
        );

        // User is typing — editor has its own local state.
        // Simulate: heading prop changes externally (e.g. undo while editing).
        // The editor content should NOT be overwritten — the user's cursor
        // position and in-progress text must be preserved.
        rerender(createHookProps({ heading: 'External Change', isEditing: true }));
        await act(async () => {});

        // The editor should still show the original content, not the external change.
        expect(result.current.getHeading()).toBe('Original');
    });

    it('getHeading returns current editor text even without committing', () => {
        const { result } = renderHook(() =>
            useHeadingEditor(createHookProps({ heading: 'Initial', isEditing: true })),
        );

        // Programmatically set editor content (simulating user typing)
        const editor = result.current.editor;
        expect(editor).not.toBeNull();
        act(() => {
            editor!.commands.setContent('<p>Typed by user</p>');
        });

        expect(result.current.getHeading()).toBe('Typed by user');
    });

    it('syncs heading after focus mode exit: editing→false + heading change', async () => {
        // Full scenario: enter focus → edit heading → exit focus
        // IdeaCard goes through: isEditing=false, heading="Old"
        //   → (focus opens, isEditing stays false for IdeaCard)
        //   → (focus exits, heading changes to "New")

        const { result, rerender } = renderHook(
            (props) => useHeadingEditor(props),
            { initialProps: createHookProps({ heading: 'Mindmap', isEditing: false }) },
        );
        expect(result.current.getHeading()).toBe('Mindmap');

        // Focus mode exits: heading updated in store, isEditing still false.
        rerender(createHookProps({ heading: 'Mindmap + abc', isEditing: false }));
        await act(async () => {});

        expect(result.current.getHeading()).toBe('Mindmap + abc');
    });
});
