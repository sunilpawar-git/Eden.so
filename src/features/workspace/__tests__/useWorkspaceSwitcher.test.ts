/**
 * useWorkspaceSwitcher Hook Tests - TDD: Write tests FIRST
 * Tests for atomic workspace switching with prefetch-then-swap pattern
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWorkspaceSwitcher } from '../hooks/useWorkspaceSwitcher';

// Mock the workspace service
const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
const mockSaveNodes = vi.fn();
const mockSaveEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
    saveNodes: (...args: unknown[]) => mockSaveNodes(...args),
    saveEdges: (...args: unknown[]) => mockSaveEdges(...args),
}));

// Mock auth store
const mockUser = { id: 'user-1', email: 'test@example.com' };
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: () => ({ user: mockUser }),
}));

// Mock canvas store
const mockSetNodes = vi.fn();
const mockSetEdges = vi.fn();
const mockGetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        () => ({ setNodes: mockSetNodes, setEdges: mockSetEdges }),
        { getState: () => mockGetState() }
    ),
}));

// Mock workspace store
const mockSetCurrentWorkspaceId = vi.fn();
let mockCurrentWorkspaceId = 'ws-current';
vi.mock('../stores/workspaceStore', () => ({
    useWorkspaceStore: (selector: (state: { currentWorkspaceId: string }) => unknown) => {
        const state = {
            currentWorkspaceId: mockCurrentWorkspaceId,
            setCurrentWorkspaceId: mockSetCurrentWorkspaceId,
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

describe('useWorkspaceSwitcher', () => {
    const mockNodes = [{ id: 'node-1', type: 'idea', data: { prompt: 'Test' } }];
    const mockEdges = [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }];

    beforeEach(() => {
        vi.clearAllMocks();
        mockCurrentWorkspaceId = 'ws-current';
        mockLoadNodes.mockResolvedValue(mockNodes);
        mockLoadEdges.mockResolvedValue(mockEdges);
        mockSaveNodes.mockResolvedValue(undefined);
        mockSaveEdges.mockResolvedValue(undefined);
        mockGetState.mockReturnValue({ nodes: [], edges: [] });
    });

    it('returns isSwitching false initially', () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());
        expect(result.current.isSwitching).toBe(false);
    });

    it('returns error as null initially', () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());
        expect(result.current.error).toBeNull();
    });

    it('sets isSwitching true during switch', async () => {
        // Delay the load to capture isSwitching state
        mockLoadNodes.mockImplementation(() => new Promise((resolve) => {
            setTimeout(() => resolve(mockNodes), 50);
        }));

        const { result } = renderHook(() => useWorkspaceSwitcher());

        act(() => {
            void result.current.switchWorkspace('ws-new');
        });

        expect(result.current.isSwitching).toBe(true);

        await waitFor(() => {
            expect(result.current.isSwitching).toBe(false);
        });
    });

    it('prefetches new workspace data before updating store', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        // loadNodes and loadEdges should be called with new workspace ID
        expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-new');
        expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-new');
    });

    it('atomically updates nodes and edges (no empty state)', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        // setNodes and setEdges should be called with new data directly
        // No intermediate clearCanvas call
        expect(mockSetNodes).toHaveBeenCalledWith(mockNodes);
        expect(mockSetEdges).toHaveBeenCalledWith(mockEdges);
    });

    it('updates currentWorkspaceId after data is loaded', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-new');
    });

    it('sets isSwitching false after switch completes', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(result.current.isSwitching).toBe(false);
    });

    it('handles switch errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockLoadNodes.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(result.current.isSwitching).toBe(false);
        expect(result.current.error).toBeTruthy();
        // Should not update workspace ID on error
        expect(mockSetCurrentWorkspaceId).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('prevents concurrent switches', async () => {
        // Create a delayed promise to simulate slow network
        let resolveFirst: (value: unknown[]) => void;
        mockLoadNodes.mockImplementationOnce(() => new Promise((resolve) => {
            resolveFirst = resolve;
        }));

        const { result } = renderHook(() => useWorkspaceSwitcher());

        // Start first switch
        act(() => {
            void result.current.switchWorkspace('ws-new-1');
        });

        // Try second switch while first is in progress
        await act(async () => {
            await result.current.switchWorkspace('ws-new-2');
        });

        // Resolve first switch
        await act(async () => {
            resolveFirst(mockNodes);
            await new Promise((r) => setTimeout(r, 10));
        });

        // Only the first switch should have been initiated (second was skipped)
        expect(mockLoadNodes).toHaveBeenCalledTimes(1);
    });

    it('does not switch to same workspace', async () => {
        mockCurrentWorkspaceId = 'ws-same';
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-same');
        });

        // Should not call any load functions
        expect(mockLoadNodes).not.toHaveBeenCalled();
        expect(mockLoadEdges).not.toHaveBeenCalled();
        expect(result.current.isSwitching).toBe(false);
    });

    it('saves current workspace before switching when data exists', async () => {
        mockGetState.mockReturnValue({ nodes: mockNodes, edges: mockEdges });
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        expect(mockSaveNodes).toHaveBeenCalledWith('user-1', 'ws-current', mockNodes);
        expect(mockSaveEdges).toHaveBeenCalledWith('user-1', 'ws-current', mockEdges);
    });
});
