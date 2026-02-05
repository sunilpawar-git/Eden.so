/**
 * Regression Tests: Workspace Auto-Selection
 *
 * Tests for the bug fix where nodes would vanish when switching workspaces
 * or refreshing the browser because currentWorkspaceId was not being updated
 * from 'default-workspace' to an actual workspace ID.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Sidebar } from '@/shared/components/Sidebar';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { loadUserWorkspaces, saveNodes, saveEdges } from '@/features/workspace/services/workspaceService';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

// Mock stores and services
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: vi.fn(),
}));

const mockGetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), { getState: () => mockGetState() }),
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: vi.fn(),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/features/auth/services/authService', () => ({
    signOut: vi.fn(),
}));

vi.mock('@/features/workspace/services/workspaceService', () => ({
    createNewWorkspace: vi.fn(),
    loadUserWorkspaces: vi.fn(),
    saveWorkspace: vi.fn(),
    saveNodes: vi.fn(),
    saveEdges: vi.fn(),
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
        vi.mocked(useAuthStore).mockReturnValue({
            user: { id: 'user-1', name: 'Test User', avatarUrl: '' },
            isLoading: false,
            isAuthenticated: true,
            error: null,
            setUser: vi.fn(),
            clearUser: vi.fn(),
            setLoading: vi.fn(),
            setError: vi.fn(),
        } as Partial<ReturnType<typeof useAuthStore>> as ReturnType<typeof useAuthStore>);

        vi.mocked(useCanvasStore).mockReturnValue(mockClearCanvas);
        mockGetState.mockReturnValue({ nodes: [], edges: [] });

        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

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

        // currentWorkspaceId is 'default-workspace' which doesn't exist
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({ currentWorkspaceId: 'default-workspace', workspaces: [] });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        render(<Sidebar />);

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

        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({ currentWorkspaceId: 'ws-existing', workspaces: [] });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        render(<Sidebar />);

        await waitFor(() => {
            expect(mockSetWorkspaces).toHaveBeenCalledWith(mockWorkspaces);
        });

        expect(mockSetCurrentWorkspaceId).not.toHaveBeenCalled();
    });

    it('should handle empty workspace list gracefully', async () => {
        vi.mocked(loadUserWorkspaces).mockResolvedValue([]);

        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({ currentWorkspaceId: 'default-workspace', workspaces: [] });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        render(<Sidebar />);

        await waitFor(() => {
            expect(mockSetWorkspaces).toHaveBeenCalledWith([]);
        });

        expect(mockSetCurrentWorkspaceId).not.toHaveBeenCalled();
    });
});
