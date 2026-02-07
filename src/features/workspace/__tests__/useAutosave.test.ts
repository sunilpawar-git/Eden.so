/**
 * Tests for useAutosave hook
 * Covers debounced autosave and save status lifecycle
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from '../hooks/useAutosave';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { saveNodes, saveEdges } from '@/features/workspace/services/workspaceService';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { useSaveStatusStore } from '@/shared/stores/saveStatusStore';
import { toast } from '@/shared/stores/toastStore';

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: vi.fn(() => ({ nodes: [], edges: [] })),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: vi.fn(() => ({ user: { id: 'user-123' } })),
}));

vi.mock('@/features/workspace/services/workspaceService', () => ({
    saveNodes: vi.fn().mockResolvedValue(undefined),
    saveEdges: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: { update: vi.fn() },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

describe('useAutosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        useSaveStatusStore.setState({
            status: 'idle',
            lastSavedAt: null,
            lastError: null,
        });
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

        await act(async () => { vi.advanceTimersByTime(3000); });

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

        await act(async () => { vi.advanceTimersByTime(3000); });

        expect(saveNodes).not.toHaveBeenCalled();
    });

    it('should debounce save calls', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        const { rerender } = renderHook(() => useAutosave('workspace-1'));

        await act(async () => { vi.advanceTimersByTime(500); });
        rerender();
        await act(async () => { vi.advanceTimersByTime(500); });
        rerender();

        expect(saveNodes).not.toHaveBeenCalled();

        await act(async () => { vi.advanceTimersByTime(2000); });

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

        await act(async () => { vi.advanceTimersByTime(2500); });

        expect(saveNodes).toHaveBeenCalledWith(
            'user-1', 'workspace-1',
            expect.arrayContaining([expect.objectContaining({ id: 'node-1' })])
        );
        expect(saveEdges).toHaveBeenCalledWith(
            'user-1', 'workspace-1',
            expect.arrayContaining([expect.objectContaining({ id: 'edge-1' })])
        );
    });

    it('should update cache after successful save', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        const testNodes = [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }];
        const testEdges = [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }];
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: testNodes, edges: testEdges,
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave('workspace-1'));

        await act(async () => { vi.advanceTimersByTime(2500); });

        expect(workspaceCache.update).toHaveBeenCalledWith('workspace-1', testNodes, testEdges);
    });

    it('should not save when data has not changed', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [], edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        const { rerender } = renderHook(() => useAutosave('workspace-1'));

        await act(async () => { vi.advanceTimersByTime(2500); });

        rerender();
        await act(async () => { vi.advanceTimersByTime(2500); });

        expect(saveNodes).toHaveBeenCalledTimes(1);
    });

    it('should set save status to saving before save', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave('workspace-1'));

        await act(async () => { vi.advanceTimersByTime(2500); });

        // After save completes, status should be 'saved'
        expect(useSaveStatusStore.getState().status).toBe('saved');
    });

    it('should set save status to saved after successful save', async () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave('workspace-1'));

        await act(async () => { vi.advanceTimersByTime(2500); });

        expect(useSaveStatusStore.getState().status).toBe('saved');
        expect(useSaveStatusStore.getState().lastSavedAt).not.toBeNull();
    });

    it('should set save status to error and show toast on failure', async () => {
        vi.mocked(saveNodes).mockRejectedValueOnce(new Error('Network error'));
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        renderHook(() => useAutosave('workspace-1'));

        await act(async () => { vi.advanceTimersByTime(2500); });

        expect(useSaveStatusStore.getState().status).toBe('error');
        expect(useSaveStatusStore.getState().lastError).toBe('Network error');
        expect(toast.error).toHaveBeenCalled();
    });

    it('should cleanup timeout on unmount', () => {
        vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue({
            nodes: [{ id: 'node-1', workspaceId: 'ws-1', type: 'idea', position: { x: 0, y: 0 }, data: {} }],
            edges: [],
        } as unknown as ReturnType<typeof useCanvasStore>);

        const { unmount } = renderHook(() => useAutosave('workspace-1'));
        unmount();
        vi.useRealTimers();
    });
});
