/**
 * useAddNode limit tests — verifies that the node creation guard
 * prevents node creation when the free tier limit is reached.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddNode } from '../useAddNode';

// ── Mock: useNodeCreationGuard ──────────────────────────────────────────────
let mockGuardAllowed = true;
vi.mock('@/features/subscription/hooks/useNodeCreationGuard', () => ({
    useNodeCreationGuard: () => ({
        guardNodeCreation: () => mockGuardAllowed,
    }),
}));

// ── Mock: dependencies ──────────────────────────────────────────────────────
const mockAddNodeWithUndo = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) =>
            selector({ nodes: [], edges: [] }),
        { getState: () => ({ nodes: [], edges: [] }) },
    ),
}));
vi.mock('@/app/contexts/WorkspaceContext', () => ({
    useWorkspaceContext: () => ({ currentWorkspaceId: 'ws-1', isSwitching: false }),
}));
vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ canvasFreeFlow: false }),
}));
vi.mock('@/features/canvas/stores/focusStore', () => ({
    useFocusStore: Object.assign(
        () => null,
        { getState: () => ({ focusedNodeId: null }) },
    ),
}));
vi.mock('@/features/canvas/types/node', () => ({
    createIdeaNode: (id: string) => ({ id, type: 'idea', position: { x: 0, y: 0 }, data: {} }),
}));
vi.mock('@/features/canvas/stores/canvasStoreHelpers', () => ({
    calculateNextNodePosition: () => ({ x: 0, y: 0 }),
}));
vi.mock('@/features/canvas/services/freeFlowPlacementService', () => ({
    calculateSmartPlacement: () => ({ x: 0, y: 0 }),
}));
vi.mock('@/features/canvas/services/gridColumnsResolver', () => ({
    resolveGridColumnsFromStore: () => 4,
}));
vi.mock('@/features/canvas/hooks/usePanToNode', () => ({
    usePanToNode: () => ({ panToPosition: vi.fn() }),
}));
vi.mock('@/shared/services/analyticsService', () => ({
    trackNodeCreated: vi.fn(),
}));
vi.mock('@/features/canvas/hooks/useUndoableActions', () => ({
    useUndoableActions: () => ({ addNodeWithUndo: mockAddNodeWithUndo }),
}));

describe('useAddNode — guard integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGuardAllowed = true;
    });

    it('creates a node when guard allows', () => {
        const { result } = renderHook(() => useAddNode());
        let nodeId: string | undefined;
        act(() => { nodeId = result.current(); });
        expect(nodeId).toBeDefined();
        expect(mockAddNodeWithUndo).toHaveBeenCalledOnce();
    });

    it('blocks node creation when guard denies', () => {
        mockGuardAllowed = false;
        const { result } = renderHook(() => useAddNode());
        let nodeId: string | undefined;
        act(() => { nodeId = result.current(); });
        expect(nodeId).toBeUndefined();
        expect(mockAddNodeWithUndo).not.toHaveBeenCalled();
    });
});
