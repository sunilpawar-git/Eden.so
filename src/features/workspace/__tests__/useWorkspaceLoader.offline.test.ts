/**
 * useWorkspaceLoader hasOfflineData Tests
 * TDD: Verifies the hasOfflineData extension for PWA offline support
 *
 * Core loading behavior (cache-miss, error handling) is tested
 * extensively in useWorkspaceLoader.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useWorkspaceLoader } from '../hooks/useWorkspaceLoader';

// Exact same mock pattern as useWorkspaceLoader.test.ts
const mockLoadNodes = vi.fn();
const mockLoadEdges = vi.fn();
vi.mock('../services/workspaceService', () => ({
    loadNodes: (...args: unknown[]) => mockLoadNodes(...args),
    loadEdges: (...args: unknown[]) => mockLoadEdges(...args),
}));

const mockCacheGet = vi.fn();
vi.mock('../services/workspaceCache', () => ({
    workspaceCache: {
        get: (...args: unknown[]) => mockCacheGet(...args),
        set: vi.fn(),
        update: vi.fn(),
        has: vi.fn(),
        invalidate: vi.fn(),
        clear: vi.fn(),
        preload: vi.fn(),
    },
}));

const mockIsOnline = vi.fn().mockReturnValue(true);
vi.mock('@/shared/stores/networkStatusStore', () => ({
    useNetworkStatusStore: Object.assign(
        vi.fn(() => ({ isOnline: mockIsOnline() })),
        { getState: () => ({ isOnline: mockIsOnline() }) }
    ),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}));

const mockSetNodes = vi.fn();
const mockSetEdges = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: () => ({
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
    }),
}));

describe('useWorkspaceLoader - hasOfflineData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockLoadEdges.mockResolvedValue([]);
    });

    afterEach(() => {
        cleanup();
    });

    it('returns hasOfflineData=true when workspace is cached', async () => {
        mockCacheGet.mockReturnValue({
            nodes: [{ id: 'n1' }],
            edges: [],
            loadedAt: Date.now(),
        });

        const { result, unmount } = renderHook(() => useWorkspaceLoader('ws-cached'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.hasOfflineData).toBe(true);
        unmount();
    });

    it('includes hasOfflineData in the return type', async () => {
        mockCacheGet.mockReturnValue({
            nodes: [],
            edges: [],
            loadedAt: Date.now(),
        });

        const { result, unmount } = renderHook(() => useWorkspaceLoader('ws-type'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current).toHaveProperty('hasOfflineData');
        expect(typeof result.current.hasOfflineData).toBe('boolean');
        unmount();
    });
});
