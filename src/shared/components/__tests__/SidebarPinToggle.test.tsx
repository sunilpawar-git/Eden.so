/**
 * Sidebar Pin Toggle Tests — pin/unpin button rendering and interaction
 * Split from Sidebar.test.tsx to maintain <300 line rule
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { strings } from '@/shared/localization/strings';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';

vi.mock('@/features/auth/stores/authStore', () => ({ useAuthStore: vi.fn() }));

const mockTogglePin = vi.fn();
let mockIsPinned = true;
vi.mock('@/shared/stores/sidebarStore', () => ({
    useSidebarStore: vi.fn((selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
            isPinned: mockIsPinned,
            isHoverOpen: false,
            togglePin: mockTogglePin,
            setHoverOpen: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

const mockGetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), { getState: () => mockGetState() }),
}));
const mockWorkspaceGetState = vi.fn();
vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(vi.fn((selector) => {
        const state = {
            currentWorkspaceId: 'ws-1', workspaces: [], isLoading: false,
            setCurrentWorkspaceId: vi.fn(), addWorkspace: vi.fn(),
            setWorkspaces: vi.fn(), updateWorkspace: vi.fn(),
            removeWorkspace: vi.fn(), setLoading: vi.fn(),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return typeof selector === 'function' ? selector(state as any) : state;
    }), { getState: () => mockWorkspaceGetState() })
}));
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/features/auth/services/authService', () => ({ signOut: vi.fn() }));
vi.mock('@/features/workspace/services/workspaceService', () => ({
    createNewWorkspace: vi.fn(), loadUserWorkspaces: vi.fn().mockResolvedValue([]), saveWorkspace: vi.fn(),
    saveNodes: vi.fn(), saveEdges: vi.fn(),
}));
vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher', () => ({
    useWorkspaceSwitcher: vi.fn(() => ({
        isSwitching: false, error: null, switchWorkspace: vi.fn(),
    })),
}));
vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: {
        preload: vi.fn().mockResolvedValue(undefined),
        hydrateFromIdb: vi.fn().mockResolvedValue(undefined),
    },
}));
vi.mock('@/shared/services/indexedDbService', () => ({
    indexedDbService: { put: vi.fn().mockResolvedValue(true), get: vi.fn().mockResolvedValue(null) },
    IDB_STORES: { workspaceData: 'workspace-data', pinnedWorkspaces: 'pinned-workspaces', metadata: 'metadata' },
}));

describe('Sidebar pin toggle button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsPinned = true;
        mockWorkspaceGetState.mockReturnValue({
            currentWorkspaceId: 'ws-1', workspaces: [], isLoading: false,
            setCurrentWorkspaceId: vi.fn(), addWorkspace: vi.fn(),
            setWorkspaces: vi.fn(), updateWorkspace: vi.fn(),
            removeWorkspace: vi.fn(), setLoading: vi.fn(),
        });
        vi.mocked(useAuthStore).mockReturnValue({
            user: { id: 'user-1', name: 'Test User', avatarUrl: '' },
            isLoading: false, isAuthenticated: true, error: null,
            setUser: vi.fn(), clearUser: vi.fn(), setLoading: vi.fn(), setError: vi.fn(),
        } as Partial<ReturnType<typeof useAuthStore>> as ReturnType<typeof useAuthStore>);
        vi.mocked(useCanvasStore).mockReturnValue(vi.fn());
        mockGetState.mockReturnValue({ nodes: [], edges: [] });
        // The mock implementation is now inside the module mock above
        vi.mocked(useWorkspaceSwitcher).mockReturnValue({
            isSwitching: false, error: null, switchWorkspace: vi.fn(),
        });
    });

    it('should render pin toggle button in header', () => {
        render(<Sidebar />);
        expect(screen.getByLabelText(strings.sidebar.unpin)).toBeInTheDocument();
    });

    it('should show unpin label when sidebar is pinned', () => {
        mockIsPinned = true;
        render(<Sidebar />);
        expect(screen.getByLabelText(strings.sidebar.unpin)).toBeInTheDocument();
    });

    it('should show pin label when sidebar is unpinned', () => {
        mockIsPinned = false;
        render(<Sidebar />);
        expect(screen.getByLabelText(strings.sidebar.pin)).toBeInTheDocument();
    });

    it('should call togglePin when clicked', () => {
        render(<Sidebar />);
        fireEvent.click(screen.getByLabelText(strings.sidebar.unpin));
        expect(mockTogglePin).toHaveBeenCalledTimes(1);
    });

    it('should have aria-pressed matching isPinned state', () => {
        mockIsPinned = true;
        render(<Sidebar />);
        expect(screen.getByLabelText(strings.sidebar.unpin)).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed false when unpinned', () => {
        mockIsPinned = false;
        render(<Sidebar />);
        expect(screen.getByLabelText(strings.sidebar.pin)).toHaveAttribute('aria-pressed', 'false');
    });

    it('should contain an SVG icon', () => {
        render(<Sidebar />);
        const pinButton = screen.getByLabelText(strings.sidebar.unpin);
        expect(pinButton.querySelector('svg')).toBeInTheDocument();
    });
});
