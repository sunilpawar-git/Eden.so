import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { signOut } from '@/features/auth/services/authService';
import { createNewWorkspace, loadUserWorkspaces, saveNodes, saveEdges } from '@/features/workspace/services/workspaceService';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

vi.mock('@/features/auth/stores/authStore', () => ({ useAuthStore: vi.fn() }));
const mockGetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), { getState: () => mockGetState() }),
}));
vi.mock('@/features/workspace/stores/workspaceStore', () => ({ useWorkspaceStore: vi.fn() }));
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/features/auth/services/authService', () => ({ signOut: vi.fn() }));
vi.mock('@/features/workspace/services/workspaceService', () => ({
    createNewWorkspace: vi.fn(), loadUserWorkspaces: vi.fn(), saveWorkspace: vi.fn(),
    saveNodes: vi.fn(), saveEdges: vi.fn(),
}));

describe('Sidebar', () => {
    const mockClearCanvas = vi.fn();
    const mockSetCurrentWorkspaceId = vi.fn();
    const mockAddWorkspace = vi.fn();
    const mockSetWorkspaces = vi.fn();
    const mockUpdateWorkspace = vi.fn();

    const createMockState = (overrides = {}) => ({
        currentWorkspaceId: 'default-workspace', workspaces: [], isLoading: false,
        setCurrentWorkspaceId: mockSetCurrentWorkspaceId, addWorkspace: mockAddWorkspace,
        setWorkspaces: mockSetWorkspaces, updateWorkspace: mockUpdateWorkspace,
        removeWorkspace: vi.fn(), setLoading: vi.fn(), ...overrides,
    });

    const mockWorkspacesList = [
        { id: 'ws-1', name: 'Project Alpha', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() },
        { id: 'ws-2', name: 'Project Beta', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() },
    ];

    const setupWithWorkspaces = (workspaces = mockWorkspacesList, currentId = 'ws-1') => {
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({ currentWorkspaceId: currentId, workspaces });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuthStore).mockReturnValue({
            user: { id: 'user-1', name: 'Test User', avatarUrl: '' },
            isLoading: false, isAuthenticated: true, error: null,
            setUser: vi.fn(), clearUser: vi.fn(), setLoading: vi.fn(), setError: vi.fn(),
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

    describe('workspace creation', () => {
        it('should create, add, and switch to new workspace', async () => {
            const mockWorkspace = { id: 'ws-new', name: 'Untitled Workspace', userId: 'user-1', canvasSettings: {}, createdAt: new Date(), updatedAt: new Date() };
            vi.mocked(createNewWorkspace).mockResolvedValue(mockWorkspace as ReturnType<typeof createNewWorkspace> extends Promise<infer T> ? T : never);

            render(<Sidebar />);
            fireEvent.click(screen.getByText(strings.workspace.newWorkspace));

            await waitFor(() => {
                expect(createNewWorkspace).toHaveBeenCalledWith('user-1');
                expect(mockAddWorkspace).toHaveBeenCalledWith(mockWorkspace);
                expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-new');
                expect(mockClearCanvas).toHaveBeenCalled();
                expect(toast.success).toHaveBeenCalled();
            });
        });

        it('should show error toast when creation fails', async () => {
            vi.mocked(createNewWorkspace).mockRejectedValue(new Error('Network error'));
            render(<Sidebar />);
            fireEvent.click(screen.getByText(strings.workspace.newWorkspace));
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(strings.errors.generic));
        });
    });

    describe('workspace display and selection', () => {
        it('should display workspaces from store', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            expect(screen.getByText('Project Alpha')).toBeInTheDocument();
            expect(screen.getByText('Project Beta')).toBeInTheDocument();
        });

        it('should switch workspace on click', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            await waitFor(() => expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-2'));
        });
    });

    describe('workspace data persistence', () => {
        it('should save data before switching workspaces', async () => {
            const mockNodes = [{ id: 'node-1', type: 'idea', data: { prompt: 'test' } }];
            const mockEdges = [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }];
            mockGetState.mockReturnValue({ nodes: mockNodes, edges: mockEdges });
            setupWithWorkspaces();

            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));

            await waitFor(() => {
                expect(saveNodes).toHaveBeenCalledWith('user-1', 'ws-1', mockNodes);
                expect(saveEdges).toHaveBeenCalledWith('user-1', 'ws-1', mockEdges);
                expect(mockClearCanvas).toHaveBeenCalled();
                expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-2');
            });
        });

        it('should not save when no data exists', async () => {
            mockGetState.mockReturnValue({ nodes: [], edges: [] });
            setupWithWorkspaces();

            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));

            await waitFor(() => expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-2'));
            expect(saveNodes).not.toHaveBeenCalled();
            expect(saveEdges).not.toHaveBeenCalled();
        });
    });

    describe('workspace renaming', () => {
        it('should rename workspace on double-click and blur', async () => {
            const workspaces = [{ id: 'ws-1', name: 'Old Name', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() }];
            setupWithWorkspaces(workspaces);

            render(<Sidebar />);
            fireEvent.doubleClick(screen.getByText('Old Name'));
            const input = screen.getByDisplayValue('Old Name');
            fireEvent.change(input, { target: { value: 'New Name' } });
            fireEvent.blur(input);

            await waitFor(() => expect(mockUpdateWorkspace).toHaveBeenCalledWith('ws-1', { name: 'New Name' }));
        });
    });

    describe('user section', () => {
        it('should render user info and handle sign out', async () => {
            render(<Sidebar />);
            expect(screen.getByText('Test User')).toBeInTheDocument();
            fireEvent.click(screen.getByText(strings.auth.signOut));
            expect(signOut).toHaveBeenCalledTimes(1);
        });
    });
});
