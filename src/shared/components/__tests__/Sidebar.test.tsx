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
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';

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

// Mock the workspace switcher hook
const mockSwitchWorkspace = vi.fn();
vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher', () => ({
    useWorkspaceSwitcher: vi.fn(() => ({
        isSwitching: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
    })),
}));

// Mock the workspace cache
const mockPreload = vi.fn();
const mockHydrateFromIdb = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: {
        preload: (...args: unknown[]) => mockPreload(...args),
        hydrateFromIdb: () => mockHydrateFromIdb(),
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
        // Reset workspace switcher mock
        mockSwitchWorkspace.mockResolvedValue(undefined);
        // Reset cache preload mock
        mockPreload.mockResolvedValue(undefined);
        vi.mocked(useWorkspaceSwitcher).mockReturnValue({
            isSwitching: false,
            error: null,
            switchWorkspace: mockSwitchWorkspace,
        });
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
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.mocked(createNewWorkspace).mockRejectedValue(new Error('Network error'));
            render(<Sidebar />);
            fireEvent.click(screen.getByText(strings.workspace.newWorkspace));
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(strings.errors.generic));
            consoleSpy.mockRestore();
        });
    });

    describe('workspace display and selection', () => {
        it('should display workspaces from store', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            expect(screen.getByText('Project Alpha')).toBeInTheDocument();
            expect(screen.getByText('Project Beta')).toBeInTheDocument();
        });

        it('should call switchWorkspace on workspace click', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            // Uses new switchWorkspace hook (handles save + prefetch + atomic swap)
            await waitFor(() => expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-2'));
        });

        it('should NOT call clearCanvas directly (atomic swap via hook)', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            await waitFor(() => expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-2'));
            // clearCanvas should NOT be called - hook handles atomic swap
            expect(mockClearCanvas).not.toHaveBeenCalled();
        });
    });

    describe('workspace switching via hook', () => {
        it('should use useWorkspaceSwitcher for workspace switching', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            // The hook handles: save current → prefetch new → atomic swap
            await waitFor(() => expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-2'));
        });

        it('should show error toast when switch fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockSwitchWorkspace.mockRejectedValue(new Error('Switch failed'));
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(strings.workspace.switchError));
            consoleSpy.mockRestore();
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

    describe('settings button', () => {
        it('should render settings button in footer', () => {
            render(<Sidebar />);
            expect(screen.getByLabelText(strings.settings.title)).toBeInTheDocument();
        });

        it('should call onSettingsClick when settings button is clicked', () => {
            const mockOnSettingsClick = vi.fn();
            render(<Sidebar onSettingsClick={mockOnSettingsClick} />);
            
            fireEvent.click(screen.getByLabelText(strings.settings.title));
            expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
        });

        it('should use PlusIcon for new workspace button', () => {
            render(<Sidebar />);
            const newWorkspaceButton = screen.getByText(strings.workspace.newWorkspace);
            // Check that the button contains an SVG icon
            const svgIcon = newWorkspaceButton.parentElement?.querySelector('svg');
            expect(svgIcon).toBeInTheDocument();
        });
    });

    describe('cache preloading', () => {
        it('should preload all workspace data into cache on mount', async () => {
            vi.mocked(loadUserWorkspaces).mockResolvedValue(mockWorkspacesList);
            setupWithWorkspaces();
            render(<Sidebar />);

            await waitFor(() => {
                expect(mockPreload).toHaveBeenCalledWith('user-1', ['ws-1', 'ws-2']);
            });
        });

        it('should handle preload errors gracefully', async () => {
            vi.mocked(loadUserWorkspaces).mockResolvedValue(mockWorkspacesList);
            mockPreload.mockRejectedValue(new Error('Preload failed'));
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            setupWithWorkspaces();

            render(<Sidebar />);

            // Should not crash, render should complete normally
            await waitFor(() => {
                expect(screen.getByText('Project Alpha')).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });
    });
});
