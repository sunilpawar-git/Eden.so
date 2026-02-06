/**
 * Tests for useAutosave hook
 * Covers debounced autosave functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from '../hooks/useAutosave';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { saveNodes, saveEdges } from '@/features/workspace/services/workspaceService';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';

// Mock dependencies (vitest hoists these automatically)
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: vi.fn(() => ({
        nodes: [],
        edges: [],
    })),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: vi.fn(() => ({
        user: { id: 'user-123' },
    })),
}));

vi.mock('@/features/workspace/services/workspaceService', () => ({
    saveNodes: vi.fn().mockResolvedValue(undefined),
    saveEdges: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: {
        update: vi.fn(),
    },
}));

describe('useAutosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should not save when user is not logged in', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: null } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave('workspace-1'));

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        expect(saveNodes).not.toHaveBeenCalled();
        expect(saveEdges).not.toHaveBeenCalled();
    });

    it('should not save when workspaceId is empty', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave(''));

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        expect(saveNodes).not.toHaveBeenCalled();
        expect(saveEdges).not.toHaveBeenCalled();
    });

    it('should debounce save calls', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        const { rerender } = renderHook(() => useAutosave('workspace-1'));

        // Simulate rapid changes
        await act(async () => {
            vi.advanceTimersByTime(500);
        });
        rerender();
        await act(async () => {
            vi.advanceTimersByTime(500);
        });
        rerender();

        // Should not have saved yet (debounce period not complete)
        expect(saveNodes).not.toHaveBeenCalled();

        // Advance past debounce period
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });

        expect(saveNodes).toHaveBeenCalledTimes(1);
        expect(saveEdges).toHaveBeenCalledTimes(1);
    });

    it('should save after debounce period', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }],
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave('workspace-1'));

        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        expect(saveNodes).toHaveBeenCalledWith(
            'user-1',
            'workspace-1',
            expect.arrayContaining([expect.objectContaining({ id: 'node-1' })])
        );
        expect(saveEdges).toHaveBeenCalledWith(
            'user-1',
            'workspace-1',
            expect.arrayContaining([expect.objectContaining({ id: 'edge-1' })])
        );
    });

    it('should update cache after successful save', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        const testNodes = [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }];
        const testEdges = [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }];
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: testNodes,
            edges: testEdges,
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave('workspace-1'));

        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        expect(workspaceCache.update).toHaveBeenCalledWith('workspace-1', testNodes, testEdges);
    });

    it('should not save when data has not changed', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        const { rerender } = renderHook(() => useAutosave('workspace-1'));

        // First save
        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        // Rerender with same data
        rerender();
        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        // Should only be called once (dedupe)
        expect(saveNodes).toHaveBeenCalledTimes(1);
    });

    it('should handle save errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(saveNodes).mockRejectedValueOnce(new Error('Network error'));
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave('workspace-1'));

        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        expect(consoleSpy).toHaveBeenCalledWith('[Autosave] Failed:', expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('should cleanup timeout on unmount', () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        const { unmount } = renderHook(() => useAutosave('workspace-1'));

        // Unmount before debounce completes
        unmount();

        // These should not throw even with real timers
        vi.useRealTimers();
    });
});
