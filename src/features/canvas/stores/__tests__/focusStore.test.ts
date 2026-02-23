/**
 * Focus Store Tests - TDD: RED phase first
 * Tests for the focus mode state management (SSOT for which node is focused)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useFocusStore } from '../focusStore';

describe('focusStore', () => {
    beforeEach(() => {
        useFocusStore.setState({ focusedNodeId: null });
    });

    it('has null focusedNodeId in initial state', () => {
        const { focusedNodeId } = useFocusStore.getState();
        expect(focusedNodeId).toBeNull();
    });

    it('enterFocus sets focusedNodeId', () => {
        useFocusStore.getState().enterFocus('node-1');
        expect(useFocusStore.getState().focusedNodeId).toBe('node-1');
    });

    it('exitFocus clears focusedNodeId to null', () => {
        useFocusStore.getState().enterFocus('node-1');
        useFocusStore.getState().exitFocus();
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('enterFocus while already focused switches to new node', () => {
        useFocusStore.getState().enterFocus('node-1');
        useFocusStore.getState().enterFocus('node-2');
        expect(useFocusStore.getState().focusedNodeId).toBe('node-2');
    });

    it('exitFocus when not focused is a no-op', () => {
        useFocusStore.getState().exitFocus();
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('isFocused selector returns true when a node is focused', () => {
        useFocusStore.getState().enterFocus('node-1');
        const isFocused = useFocusStore.getState().focusedNodeId !== null;
        expect(isFocused).toBe(true);
    });

    it('isFocused selector returns false when no node is focused', () => {
        const isFocused = useFocusStore.getState().focusedNodeId !== null;
        expect(isFocused).toBe(false);
    });
});
