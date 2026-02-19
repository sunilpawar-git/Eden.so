/**
 * useNodeShortcuts Tests — Document-level keyboard shortcuts for selected nodes
 * These fire at the document level so they work regardless of DOM focus.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeShortcuts } from '../useNodeShortcuts';

/** Helper: dispatch a keydown event on document */
function pressKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
    act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key, bubbles: true, cancelable: true, ...opts,
        }));
    });
}

describe('useNodeShortcuts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ editingNodeId: null });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fires shortcut when node is selected and not editing', () => {
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { t: onTag }));

        pressKey('t');
        expect(onTag).toHaveBeenCalledTimes(1);
    });

    it('is case-insensitive (T fires t handler)', () => {
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { t: onTag }));

        pressKey('T');
        expect(onTag).toHaveBeenCalledTimes(1);
    });

    it('does NOT fire when node is not selected', () => {
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', false, { t: onTag }));

        pressKey('t');
        expect(onTag).not.toHaveBeenCalled();
    });

    it('does NOT fire when any node is being edited', () => {
        useCanvasStore.setState({ editingNodeId: 'node-1' });
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { t: onTag }));

        pressKey('t');
        expect(onTag).not.toHaveBeenCalled();
    });

    it('does NOT fire when another node is being edited', () => {
        useCanvasStore.setState({ editingNodeId: 'node-2' });
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { t: onTag }));

        pressKey('t');
        expect(onTag).not.toHaveBeenCalled();
    });

    it('does NOT fire for keys with Ctrl modifier', () => {
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { t: onTag }));

        pressKey('t', { ctrlKey: true });
        expect(onTag).not.toHaveBeenCalled();
    });

    it('does NOT fire for keys with Meta modifier', () => {
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { t: onTag }));

        pressKey('t', { metaKey: true });
        expect(onTag).not.toHaveBeenCalled();
    });

    it('does NOT fire for non-shortcut keys', () => {
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { t: onTag }));

        pressKey('x');
        expect(onTag).not.toHaveBeenCalled();
    });

    it('fires different handlers for different keys', () => {
        const onTag = vi.fn();
        const onCollapse = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, {
            t: onTag,
            c: onCollapse,
        }));

        pressKey('t');
        expect(onTag).toHaveBeenCalledTimes(1);
        expect(onCollapse).not.toHaveBeenCalled();

        pressKey('c');
        expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    it('does NOT fire when target is an input element', () => {
        const onTag = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { t: onTag }));

        // Simulate event from an input element
        const input = document.createElement('input');
        document.body.appendChild(input);
        act(() => {
            const event = new KeyboardEvent('keydown', {
                key: 't', bubbles: true, cancelable: true,
            });
            // Override target
            Object.defineProperty(event, 'target', { value: input });
            document.dispatchEvent(event);
        });
        expect(onTag).not.toHaveBeenCalled();
        input.remove();
    });

    it('does NOT intercept globally reserved shortcut keys (e.g. N for Add Node)', () => {
        const onN = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { n: onN }));

        pressKey('n');
        expect(onN).not.toHaveBeenCalled();
    });

    it('does NOT intercept uppercase globally reserved shortcut keys', () => {
        const onN = vi.fn();
        renderHook(() => useNodeShortcuts('node-1', true, { n: onN }));

        pressKey('N');
        expect(onN).not.toHaveBeenCalled();
    });

    it('cleans up listener when node becomes unselected', () => {
        const onTag = vi.fn();
        const { rerender } = renderHook(
            ({ selected }) => useNodeShortcuts('node-1', selected, { t: onTag }),
            { initialProps: { selected: true } },
        );

        pressKey('t');
        expect(onTag).toHaveBeenCalledTimes(1);

        // Deselect node
        rerender({ selected: false });

        pressKey('t');
        // Should still be 1 (not 2)
        expect(onTag).toHaveBeenCalledTimes(1);
    });
});
