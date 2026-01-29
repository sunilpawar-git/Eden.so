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
    toast: {
        info: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
    },
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

describe('Sidebar', () => {
    const mockClearCanvas = vi.fn();
    const mockSetCurrentWorkspaceId = vi.fn();
    const mockAddWorkspace = vi.fn();
    const mockSetWorkspaces = vi.fn();
    const mockUpdateWorkspace = vi.fn();
    const mockRemoveWorkspace = vi.fn();
    const mockSetLoading = vi.fn();

    const createMockState = (overrides = {}) => ({
        currentWorkspaceId: 'default-workspace',
        workspaces: [],
        isLoading: false,
        setCurrentWorkspaceId: mockSetCurrentWorkspaceId,
        addWorkspace: mockAddWorkspace,
        setWorkspaces: mockSetWorkspaces,
        updateWorkspace: mockUpdateWorkspace,
        removeWorkspace: mockRemoveWorkspace,
        setLoading: mockSetLoading,
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
        
        // Mock getState for save-before-switch functionality
        mockGetState.mockReturnValue({
            nodes: [],
            edges: [],
        });
        
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });
        
        vi.mocked(loadUserWorkspaces).mockResolvedValue([]);
        vi.mocked(saveNodes).mockResolvedValue(undefined);
        vi.mocked(saveEdges).mockResolvedValue(undefined);
    });

    it('should create a new workspace when "+ New Workspace" is clicked', async () => {
        const mockWorkspace = { id: 'ws-1', name: 'Untitled Workspace', userId: 'user-1', canvasSettings: {}, createdAt: new Date(), updatedAt: new Date() };
        vi.mocked(createNewWorkspace).mockResolvedValue(mockWorkspace as ReturnType<typeof createNewWorkspace> extends Promise<infer T> ? T : never);

        render(<Sidebar />);

        const newWorkspaceBtn = screen.getByText(strings.workspace.newWorkspace);
        fireEvent.click(newWorkspaceBtn);

        await waitFor(() => {
            expect(createNewWorkspace).toHaveBeenCalledWith('user-1');
        });
        
        await waitFor(() => {
            expect(mockClearCanvas).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalled();
        });
    });

    it('should add new workspace to sidebar list after creation', async () => {
        const mockWorkspace = { id: 'ws-new', name: 'Untitled Workspace', userId: 'user-1', canvasSettings: {}, createdAt: new Date(), updatedAt: new Date() };
        vi.mocked(createNewWorkspace).mockResolvedValue(mockWorkspace as ReturnType<typeof createNewWorkspace> extends Promise<infer T> ? T : never);

        render(<Sidebar />);

        const newWorkspaceBtn = screen.getByText(strings.workspace.newWorkspace);
        fireEvent.click(newWorkspaceBtn);

        await waitFor(() => {
            expect(mockAddWorkspace).toHaveBeenCalledWith(mockWorkspace);
        });
    });

    it('should switch to newly created workspace', async () => {
        const mockWorkspace = { id: 'ws-new', name: 'Untitled Workspace', userId: 'user-1', canvasSettings: {}, createdAt: new Date(), updatedAt: new Date() };
        vi.mocked(createNewWorkspace).mockResolvedValue(mockWorkspace as ReturnType<typeof createNewWorkspace> extends Promise<infer T> ? T : never);

        render(<Sidebar />);

        const newWorkspaceBtn = screen.getByText(strings.workspace.newWorkspace);
        fireEvent.click(newWorkspaceBtn);

        await waitFor(() => {
            expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-new');
        });
    });

    it('should display workspaces from workspace store', async () => {
        const mockWorkspaces = [
            { id: 'ws-1', name: 'Project Alpha', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
            { id: 'ws-2', name: 'Project Beta', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
        ];
        
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({
                currentWorkspaceId: 'ws-1',
                workspaces: mockWorkspaces,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        render(<Sidebar />);

        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('should switch workspace when clicking on a workspace item', async () => {
        const mockWorkspaces = [
            { id: 'ws-1', name: 'Project Alpha', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
            { id: 'ws-2', name: 'Project Beta', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
        ];
        
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({
                currentWorkspaceId: 'ws-1',
                workspaces: mockWorkspaces,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        render(<Sidebar />);

        const projectBeta = screen.getByText('Project Beta');
        fireEvent.click(projectBeta);

        await waitFor(() => {
            expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-2');
        });
    });

    it('should save current workspace data before switching to another workspace', async () => {
        const mockWorkspaces = [
            { id: 'ws-1', name: 'Project Alpha', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
            { id: 'ws-2', name: 'Project Beta', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
        ];
        
        const mockNodes = [{ id: 'node-1', type: 'idea', data: { prompt: 'test' } }];
        const mockEdges = [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }];
        
        mockGetState.mockReturnValue({
            nodes: mockNodes,
            edges: mockEdges,
        });
        
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({
                currentWorkspaceId: 'ws-1',
                workspaces: mockWorkspaces,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        render(<Sidebar />);

        const projectBeta = screen.getByText('Project Beta');
        fireEvent.click(projectBeta);

        await waitFor(() => {
            // Should save current workspace before switching
            expect(saveNodes).toHaveBeenCalledWith('user-1', 'ws-1', mockNodes);
            expect(saveEdges).toHaveBeenCalledWith('user-1', 'ws-1', mockEdges);
        });
        
        await waitFor(() => {
            // Should clear canvas and switch after saving
            expect(mockClearCanvas).toHaveBeenCalled();
            expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-2');
        });
    });

    it('should not save when switching if current workspace has no nodes or edges', async () => {
        const mockWorkspaces = [
            { id: 'ws-1', name: 'Project Alpha', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
            { id: 'ws-2', name: 'Project Beta', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
        ];
        
        // Empty nodes and edges
        mockGetState.mockReturnValue({
            nodes: [],
            edges: [],
        });
        
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({
                currentWorkspaceId: 'ws-1',
                workspaces: mockWorkspaces,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        render(<Sidebar />);

        const projectBeta = screen.getByText('Project Beta');
        fireEvent.click(projectBeta);

        await waitFor(() => {
            expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-2');
        });
        
        // Should NOT call save when there's no data
        expect(saveNodes).not.toHaveBeenCalled();
        expect(saveEdges).not.toHaveBeenCalled();
    });

    it('should allow renaming a workspace', async () => {
        const mockWorkspaces = [
            { id: 'ws-1', name: 'Old Name', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() },
        ];
        
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({
                currentWorkspaceId: 'ws-1',
                workspaces: mockWorkspaces,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });

        render(<Sidebar />);

        // Double-click to edit
        const workspaceItem = screen.getByText('Old Name');
        fireEvent.doubleClick(workspaceItem);

        // Should show input for editing
        const input = screen.getByDisplayValue('Old Name');
        fireEvent.change(input, { target: { value: 'New Name' } });
        fireEvent.blur(input);

        await waitFor(() => {
            expect(mockUpdateWorkspace).toHaveBeenCalledWith('ws-1', { name: 'New Name' });
        });
    });

    it('should show error toast when workspace creation fails', async () => {
        vi.mocked(createNewWorkspace).mockRejectedValue(new Error('Network error'));

        render(<Sidebar />);

        const newWorkspaceBtn = screen.getByText(strings.workspace.newWorkspace);
        fireEvent.click(newWorkspaceBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(strings.errors.generic);
        });
    });

    it('should render user information from auth store', () => {
        render(<Sidebar />);
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should call signOut when "Sign out" is clicked', async () => {
        render(<Sidebar />);

        const signOutButton = screen.getByText(strings.auth.signOut);
        fireEvent.click(signOutButton);

        expect(signOut).toHaveBeenCalledTimes(1);
    });
});
