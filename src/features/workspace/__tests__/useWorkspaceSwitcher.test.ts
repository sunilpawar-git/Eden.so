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

// Mock the workspace cache
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: (...args: unknown[]) => mockCacheSet(...args),
    },
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

// Mock Knowledge Bank to prevent loading errors from dynamic imports
vi.mock('@/features/knowledgeBank/services/knowledgeBankService', () => ({
    loadKBEntries: vi.fn().mockResolvedValue([]),
    knowledgeBankService: {
        search: vi.fn(),
    }
}));

vi.mock('@/features/knowledgeBank/stores/knowledgeBankStore', () => ({
    useKnowledgeBankStore: {
        getState: vi.fn(() => ({ setEntries: vi.fn() })),
        setState: vi.fn(),
    },
}));

// Mock workspace store
const mockSetCurrentWorkspaceId = vi.fn();
const mockSetSwitching = vi.fn();
let mockCurrentWorkspaceId = 'ws-current';
let mockIsSwitching = false;
vi.mock('../stores/workspaceStore', () => ({
    useWorkspaceStore: (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
            currentWorkspaceId: mockCurrentWorkspaceId,
            setCurrentWorkspaceId: mockSetCurrentWorkspaceId,
            isSwitching: mockIsSwitching,
            setSwitching: mockSetSwitching,
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
        mockIsSwitching = false;
        mockLoadNodes.mockResolvedValue(mockNodes);
        mockLoadEdges.mockResolvedValue(mockEdges);
        mockSaveNodes.mockResolvedValue(undefined);
        mockSaveEdges.mockResolvedValue(undefined);
        mockGetState.mockReturnValue({ nodes: [], edges: [] });
        mockCacheGet.mockReturnValue(null); // Default: cache miss
    });

    it('returns isSwitching false initially', () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());
        expect(result.current.isSwitching).toBe(false);
    });

    it('returns error as null initially', () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());
        expect(result.current.error).toBeNull();
    });

    it('calls setSwitching(true) during switch', async () => {
        // Delay the load to capture setSwitching calls
        mockLoadNodes.mockImplementation(() => new Promise((resolve) => {
            setTimeout(() => resolve(mockNodes), 50);
        }));

        const { result } = renderHook(() => useWorkspaceSwitcher());

        act(() => {
            void result.current.switchWorkspace('ws-new');
        });

        // Should have called setSwitching(true) at start
        expect(mockSetSwitching).toHaveBeenCalledWith(true);

        await waitFor(() => {
            // Should have called setSwitching(false) at end
            expect(mockSetSwitching).toHaveBeenCalledWith(false);
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

    it('calls setSwitching(false) after switch completes', async () => {
        const { result } = renderHook(() => useWorkspaceSwitcher());

        await act(async () => {
            await result.current.switchWorkspace('ws-new');
        });

        // Last call should be setSwitching(false)
        expect(mockSetSwitching).toHaveBeenLastCalledWith(false);
    });

    it('handles switch errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
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

    describe('cache integration', () => {
        it('reads from cache when available (no Firestore call)', async () => {
            const cachedData = { nodes: mockNodes, edges: mockEdges, loadedAt: Date.now() };
            mockCacheGet.mockReturnValue(cachedData);

            const { result } = renderHook(() => useWorkspaceSwitcher());

            await act(async () => {
                await result.current.switchWorkspace('ws-cached');
            });

            // Should check cache
            expect(mockCacheGet).toHaveBeenCalledWith('ws-cached');
            // Should NOT call Firestore
            expect(mockLoadNodes).not.toHaveBeenCalled();
            expect(mockLoadEdges).not.toHaveBeenCalled();
            // Should still update canvas
            expect(mockSetNodes).toHaveBeenCalledWith(mockNodes);
            expect(mockSetEdges).toHaveBeenCalledWith(mockEdges);
        });

        it('falls back to Firestore on cache miss', async () => {
            mockCacheGet.mockReturnValue(null); // Cache miss

            const { result } = renderHook(() => useWorkspaceSwitcher());

            await act(async () => {
                await result.current.switchWorkspace('ws-new');
            });

            expect(mockCacheGet).toHaveBeenCalledWith('ws-new');
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-new');
            expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-new');
        });

        it('populates cache after Firestore load', async () => {
            mockCacheGet.mockReturnValue(null); // Cache miss

            const { result } = renderHook(() => useWorkspaceSwitcher());

            await act(async () => {
                await result.current.switchWorkspace('ws-new');
            });

            // Should populate cache with loaded data
            expect(mockCacheSet).toHaveBeenCalledWith(
                'ws-new',
                expect.objectContaining({ nodes: mockNodes, edges: mockEdges })
            );
        });
    });
});
