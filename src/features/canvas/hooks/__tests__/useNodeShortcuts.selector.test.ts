/**
 * useNodeShortcuts — Selector optimization tests
 * Verifies the hook subscribes to a boolean (isAnyEditing), not the raw
 * editingNodeId string, so switching between editing different nodes
 * does NOT cause re-renders in unrelated selected nodes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { useNodeShortcuts } from '../useNodeShortcuts';

describe('useNodeShortcuts selector optimization', () => {
    beforeEach(() => {
        useCanvasStore.setState({ editingNodeId: null });
    });

    it('does not re-render when editingNodeId switches between two non-null IDs', () => {
        let renderCount = 0;
        const shortcuts = { t: () => {} };

        renderHook(() => {
            renderCount++;
            useNodeShortcuts(true, shortcuts);
        });

        act(() => { useCanvasStore.setState({ editingNodeId: 'node-A' }); });
        const afterFirstEdit = renderCount;

        act(() => { useCanvasStore.setState({ editingNodeId: 'node-B' }); });
        const afterSwitchEdit = renderCount;

        expect(afterSwitchEdit).toBe(afterFirstEdit);
    });

    it('re-renders when editingNodeId transitions from null to non-null', () => {
        let renderCount = 0;
        const shortcuts = { t: () => {} };

        renderHook(() => {
            renderCount++;
            useNodeShortcuts(true, shortcuts);
        });

        const beforeEdit = renderCount;
        act(() => { useCanvasStore.setState({ editingNodeId: 'node-A' }); });

        expect(renderCount).toBeGreaterThan(beforeEdit);
    });
});
