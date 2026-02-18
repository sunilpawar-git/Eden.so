/**
 * useNodeInput Global Shortcut Key Reservation Tests
 * Verifies that reserved global keys (e.g. N for Add Node) are NOT
 * intercepted by the node-level input handler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeInput, type UseNodeInputOptions } from '../useNodeInput';
import { NODE_ID, createMockNode, createMockEditor, buildBaseOpts } from './nodeInputTestHelpers';

vi.mock('../useLinkPreviewFetch', () => ({ useLinkPreviewFetch: vi.fn() }));

describe('useNodeInput global shortcut key reservation', () => {
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

    it('does NOT enter edit mode when N key is pressed (reserved for global Add Node)', () => {
        const { result } = renderHook(() => useNodeInput(baseOpts({
            getEditableContent: vi.fn(() => ''),
        })));

        const event = new KeyboardEvent('keydown', { key: 'n' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
        act(() => { result.current.handleKeyDown(event); });

        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    it('does NOT enter edit mode when uppercase N key is pressed', () => {
        const { result } = renderHook(() => useNodeInput(baseOpts({
            getEditableContent: vi.fn(() => ''),
        })));

        const event = new KeyboardEvent('keydown', { key: 'N' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
        act(() => { result.current.handleKeyDown(event); });

        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    it('does NOT call stopPropagation for N key (allows global handler to process)', () => {
        const { result } = renderHook(() => useNodeInput(baseOpts()));

        const stopPropagation = vi.fn();
        const event = new KeyboardEvent('keydown', { key: 'n' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        Object.defineProperty(event, 'stopPropagation', { value: stopPropagation });
        act(() => { result.current.handleKeyDown(event); });

        expect(stopPropagation).not.toHaveBeenCalled();
    });

    it('still enters edit mode for other printable keys (e.g. "a")', () => {
        const { result } = renderHook(() => useNodeInput(baseOpts({
            getEditableContent: vi.fn(() => ''),
        })));

        const event = new KeyboardEvent('keydown', { key: 'a' });
        Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
        Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
        act(() => { result.current.handleKeyDown(event); });

        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });
});
