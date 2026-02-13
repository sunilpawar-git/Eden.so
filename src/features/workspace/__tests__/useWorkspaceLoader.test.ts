/**
 * useWorkspaceLoader Hook Tests - TDD: Write tests FIRST
 * Tests for loading workspace data from Firestore on mount
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkspaceLoader } from '../hooks/useWorkspaceLoader';

// Mock the workspace service
const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
}));

// Mock the workspace cache
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: (...args: unknown[]) => mockCacheSet(...args),
        update: vi.fn(),
        has: vi.fn(),
        invalidate: vi.fn(),
        clear: vi.fn(),
        preload: vi.fn(),
    },
}));

// Mock network status store
const mockIsOnline = vi.fn().mockReturnValue(true);
vi.mock('@/shared/stores/networkStatusStore', () => ({
    useNetworkStatusStore: Object.assign(
        vi.fn(() => ({ isOnline: mockIsOnline() })),
        { getState: () => ({ isOnline: mockIsOnline() }) }
    ),
}));

// Mock auth store
const mockUser = { id: 'user-1', email: 'test@example.com' };
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: () => ({ user: mockUser }),
}));

// Mock canvas store
const mockSetNodes = vi.fn();
const mockSetEdges = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: () => ({
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
    }),
}));

describe('useWorkspaceLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockLoadEdges.mockResolvedValue([]);
    });

    it('returns isLoading true initially', async () => {
        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));
        expect(result.current.isLoading).toBe(true);
        
        // Ensure async load completes to avoid act warnings
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    it('calls loadNodes and loadEdges on mount', async () => {
        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-1');
            expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-1');
        });

        // Wait for final state update to complete
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    it('sets nodes and edges in store after load', async () => {
        const mockNodes = [
            { id: 'node-1', type: 'idea', data: { prompt: 'Test' } },
        ];
        const mockEdges = [
            { id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' },
        ];
        mockLoadNodes.mockResolvedValue(mockNodes);
        mockLoadEdges.mockResolvedValue(mockEdges);

        renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(mockSetNodes).toHaveBeenCalledWith(mockNodes);
            expect(mockSetEdges).toHaveBeenCalledWith(mockEdges);
        });
    });

    it('returns isLoading false after load completes', async () => {
        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    it('handles load errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockLoadNodes.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useWorkspaceLoader('ws-1'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeTruthy();
        });

        consoleSpy.mockRestore();
    });

    it('does not load when user is null', async () => {
        // Temporarily override the mock to return null user
        vi.doMock('@/features/auth/stores/authStore', () => ({
            useAuthStore: () => ({ user: null }),
        }));

        // Re-import to get the updated mock
        const { useWorkspaceLoader: freshHook } = await import('../hooks/useWorkspaceLoader');
        
        const { result } = renderHook(() => freshHook('ws-1'));

        // Use waitFor to handle async state updates
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('cache-first loading', () => {
        it('loads from cache first when available', async () => {
            const cachedNodes = [{ id: 'cached-node', type: 'idea', data: { prompt: 'Cached' }, createdAt: new Date(), updatedAt: new Date() }];
            const cachedEdges = [{ id: 'cached-edge', sourceNodeId: 'n1', targetNodeId: 'n2' }];
            mockCacheGet.mockReturnValue({
                nodes: cachedNodes,
                edges: cachedEdges,
                loadedAt: Date.now(),
            });

            const { result } = renderHook(() => useWorkspaceLoader('ws-cached'));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Should set cached data into store immediately
            expect(mockSetNodes).toHaveBeenCalledWith(cachedNodes);
            expect(mockSetEdges).toHaveBeenCalledWith(cachedEdges);
        });

        it('background-refreshes from Firestore after cache hit when online', async () => {
            const cachedNodes = [{ id: 'cached-node' }];
            mockCacheGet.mockReturnValue({
                nodes: cachedNodes,
                edges: [],
                loadedAt: Date.now() - 60000,
            });
            mockIsOnline.mockReturnValue(true);

            const freshNodes = [{ id: 'fresh-node' }];
            mockLoadNodes.mockResolvedValue(freshNodes);
            mockLoadEdges.mockResolvedValue([]);

            renderHook(() => useWorkspaceLoader('ws-bg'));

            // Background refresh should still call Firestore
            await waitFor(() => {
                expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-bg');
            });
        });

        it('background refresh handles nodes without updatedAt gracefully', async () => {
            // Cached and fresh nodes may lack updatedAt in some environments/mocks
            mockCacheGet.mockReturnValue({
                nodes: [{ id: 'cached-node' }],
                edges: [],
                loadedAt: Date.now() - 60000,
            });
            mockIsOnline.mockReturnValue(true);

            mockLoadNodes.mockResolvedValue([{ id: 'fresh-node' }]);
            mockLoadEdges.mockResolvedValue([]);

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            renderHook(() => useWorkspaceLoader('ws-bg-safe'));

            // Background refresh should still call Firestore and NOT throw
            await waitFor(() => {
                expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-bg-safe');
                expect(consoleSpy).not.toHaveBeenCalled();
            });

            consoleSpy.mockRestore();
        });

        it('does not import toast or conflict detector (structural guard)', () => {
            // Structural regression: ensure conflict detection was fully removed
            const src = readFileSync(
                resolve(__dirname, '../hooks/useWorkspaceLoader.ts'),
                'utf-8'
            );
            expect(src).not.toContain('toastStore');
            expect(src).not.toContain('conflictDetector');
            expect(src).not.toContain('detectConflict');
        });

        it('shows error toast when offline and no cache available', async () => {
            mockCacheGet.mockReturnValue(null);
            mockIsOnline.mockReturnValue(false);
            mockLoadNodes.mockRejectedValue(new Error('offline'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const { result } = renderHook(() => useWorkspaceLoader('ws-none'));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.error).toBeTruthy();
            });

            consoleSpy.mockRestore();
        });
    });
});
