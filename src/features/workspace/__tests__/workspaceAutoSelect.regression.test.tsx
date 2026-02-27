/**
 * Regression Tests: Workspace Auto-Selection
 *
 * Tests for the bug fix where nodes would vanish when switching workspaces
 * or refreshing the browser because currentWorkspaceId was not being updated
 * from 'default-workspace' to an actual workspace ID.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { loadUserWorkspaces, saveNodes, saveEdges } from '@/features/workspace/services/workspaceService';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useSidebarWorkspaces } from '@/app/hooks/useSidebarWorkspaces';

// Mock stores and services
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: vi.fn(),
}));

const mockGetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), { getState: () => mockGetState() }),
}));

const mockWorkspaceGetState = vi.fn();
vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(vi.fn(), { getState: () => mockWorkspaceGetState() })
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/features/auth/services/authService', () => ({
    signOut: vi.fn(),
}));

// Mock the useSidebarWorkspaces hook completely since the logic moved there
vi.mock('@/app/hooks/useSidebarWorkspaces', () => ({
    useSidebarWorkspaces: vi.fn(),
}));

vi.mock('@/features/workspace/services/workspaceService', () => ({
    createNewWorkspace: vi.fn(),
    loadUserWorkspaces: vi.fn(),
    saveWorkspace: vi.fn(),
    saveNodes: vi.fn(),
    saveEdges: vi.fn(),
}));

// Mock workspace switcher hook
vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher', () => ({
    useWorkspaceSwitcher: () => ({
        isSwitching: false,
        error: null,
        switchWorkspace: vi.fn(),
    }),
}));

// Mock workspace cache
vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: {
        preload: vi.fn().mockResolvedValue(undefined),
        hydrateFromIdb: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock indexedDbService (used by Sidebar for metadata persistence)
vi.mock('@/shared/services/indexedDbService', () => ({
    indexedDbService: {
        put: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue(null),
    },
    IDB_STORES: {
        workspaceData: 'workspace-data',
        pinnedWorkspaces: 'pinned-workspaces',
        metadata: 'metadata',
    },
}));

describe('Workspace Auto-Selection (Regression)', () => {
    const mockClearCanvas = vi.fn();
    const mockSetCurrentWorkspaceId = vi.fn();
    const mockSetWorkspaces = vi.fn();

    const createMockState = (overrides = {}) => ({
        currentWorkspaceId: 'default-workspace',
        workspaces: [],
        isLoading: false,
        setCurrentWorkspaceId: mockSetCurrentWorkspaceId,
        addWorkspace: vi.fn(),
        setWorkspaces: mockSetWorkspaces,
        updateWorkspace: vi.fn(),
        removeWorkspace: vi.fn(),
        setLoading: vi.fn(),
        ...overrides,
    });

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up the mock state BEFORE any hook calls
        const defaultState = createMockState();
        mockWorkspaceGetState.mockReturnValue(defaultState);

        vi.mocked(useAuthStore).mockImplementation((selector) => {
            const state = {
                user: { id: 'user-1', name: 'Test User', avatarUrl: '' },
                isLoading: false,
                isAuthenticated: true,
                error: null,
                setUser: vi.fn(),
                clearUser: vi.fn(),
                setLoading: vi.fn(),
                setError: vi.fn(),
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        vi.mocked(useCanvasStore).mockReturnValue(mockClearCanvas);
        mockGetState.mockReturnValue({ nodes: [], edges: [] });

        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = mockWorkspaceGetState();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        vi.mocked(useSidebarWorkspaces).mockReturnValue({
            workspaces: [],
            currentWorkspaceId: 'default-workspace',
            isCreating: false,
            isCreatingDivider: false,
            handleNewWorkspace: vi.fn(),
            handleNewDivider: vi.fn(),
            handleDeleteDivider: vi.fn(),
            handleSelectWorkspace: vi.fn(),
            handleRenameWorkspace: vi.fn(),
            handleReorderWorkspace: vi.fn(),
        } as unknown as ReturnType<typeof useSidebarWorkspaces>);

        vi.mocked(loadUserWorkspaces).mockResolvedValue([]);
        vi.mocked(saveNodes).mockResolvedValue(undefined);
        vi.mocked(saveEdges).mockResolvedValue(undefined);
    });

    it('should auto-select first workspace when currentWorkspaceId does not exist', async () => {
        const mockWorkspaces = [
            { id: 'ws-real-1', name: 'Real Workspace 1', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() },
            { id: 'ws-real-2', name: 'Real Workspace 2', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() },
        ];

        vi.mocked(loadUserWorkspaces).mockResolvedValue(mockWorkspaces);

        // Set up mock state BEFORE hook runs (for getState() calls)
        const state = createMockState({ currentWorkspaceId: 'default-workspace', workspaces: [] });
        mockWorkspaceGetState.mockReturnValue(state);

        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        const { renderHook } = await import('@testing-library/react');
        const { useWorkspaceLoading } = await import('@/app/hooks/useWorkspaceLoading');

        vi.unmock('@/app/hooks/useWorkspaceLoading');

        renderHook(() => useWorkspaceLoading());

        await waitFor(() => {
            expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-real-1');
        });
    });

    it('should NOT change currentWorkspaceId if it exists in loaded workspaces', async () => {
        const mockWorkspaces = [
            { id: 'ws-existing', name: 'Existing', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() },
            { id: 'ws-other', name: 'Other', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() },
        ];

        vi.mocked(loadUserWorkspaces).mockResolvedValue(mockWorkspaces);

        // Set up mock state BEFORE hook runs (for getState() calls)
        const state = createMockState({ currentWorkspaceId: 'ws-existing', workspaces: [] });
        mockWorkspaceGetState.mockReturnValue(state);

        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        const { renderHook } = await import('@testing-library/react');
        const { useWorkspaceLoading } = await import('@/app/hooks/useWorkspaceLoading');

        renderHook(() => useWorkspaceLoading());

        await waitFor(() => {
            expect(mockSetWorkspaces).toHaveBeenCalledWith(mockWorkspaces);
        });

        expect(mockSetCurrentWorkspaceId).not.toHaveBeenCalled();
    });

    it('should handle empty workspace list gracefully', async () => {
        vi.mocked(loadUserWorkspaces).mockResolvedValue([]);

        // Set up mock state BEFORE hook runs (for getState() calls)
        const state = createMockState();
        mockWorkspaceGetState.mockReturnValue(state);

        const { renderHook } = await import('@testing-library/react');
        const { useWorkspaceLoading } = await import('@/app/hooks/useWorkspaceLoading');

        renderHook(() => useWorkspaceLoading());

        await waitFor(() => {
            expect(mockSetWorkspaces).toHaveBeenCalledWith([]);
        });

        expect(mockSetCurrentWorkspaceId).not.toHaveBeenCalled();
    });
});
