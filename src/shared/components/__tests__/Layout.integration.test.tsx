/**
 * Layout Integration Tests — sidebar pin/hover mode + elastic topbar
 * Tests the coordination between Layout, Sidebar, and sidebarStore
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from '../Layout';
import { strings } from '@/shared/localization/strings';

let mockIsPinned = true;
let mockIsHoverOpen = false;
const mockSetHoverOpen = vi.fn();
const mockTogglePin = vi.fn();

vi.mock('@/shared/stores/sidebarStore', () => ({
    useSidebarStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) => {
        const state = {
            isPinned: mockIsPinned,
            isHoverOpen: mockIsHoverOpen,
            togglePin: mockTogglePin,
            setHoverOpen: mockSetHoverOpen,
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: () => ({
        user: { id: 'user-1', name: 'Test User', avatarUrl: '' },
    }),
}));

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn((selector: (s: Record<string, unknown>) => unknown) => {
            const state = { nodes: [], edges: [], clearCanvas: vi.fn(), selectNode: vi.fn(), clearSelection: vi.fn() };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        { getState: () => ({ nodes: [], edges: [] }) },
    ),
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) => {
        const state = {
            currentWorkspaceId: 'ws-1', workspaces: [],
            setCurrentWorkspaceId: vi.fn(), addWorkspace: vi.fn(),
            setWorkspaces: vi.fn(), updateWorkspace: vi.fn(),
            removeWorkspace: vi.fn(), setLoading: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/features/auth/services/authService', () => ({ signOut: vi.fn() }));
vi.mock('@/features/workspace/services/workspaceService', () => ({
    createNewWorkspace: vi.fn(), loadUserWorkspaces: vi.fn().mockResolvedValue([]),
    saveWorkspace: vi.fn(), saveNodes: vi.fn(), saveEdges: vi.fn(),
}));
vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher', () => ({
    useWorkspaceSwitcher: () => ({ isSwitching: false, error: null, switchWorkspace: vi.fn() }),
}));
vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: { preload: vi.fn().mockResolvedValue(undefined), hydrateFromIdb: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/shared/services/indexedDbService', () => ({
    indexedDbService: { put: vi.fn().mockResolvedValue(true), get: vi.fn().mockResolvedValue(null) },
    IDB_STORES: { workspaceData: 'wd', pinnedWorkspaces: 'pw', metadata: 'md' },
}));
vi.mock('@/features/search', () => ({
    SearchBar: () => <div data-testid="search-bar" />,
}));
vi.mock('@/features/workspace/components/WorkspaceControls', () => ({
    WorkspaceControls: () => <div data-testid="workspace-controls" />,
}));
vi.mock('@/features/knowledgeBank/components/KnowledgeBankAddButton', () => ({
    KnowledgeBankAddButton: () => <div data-testid="kb-add-button" />,
}));
vi.mock('@/features/knowledgeBank/components/KnowledgeBankPanel', () => ({
    KnowledgeBankPanel: () => <div data-testid="kb-panel" />,
}));

describe('Layout integration - sidebar pin/hover mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsPinned = true;
        mockIsHoverOpen = false;
    });

    it('should set data-sidebar-pinned="true" when pinned', () => {
        mockIsPinned = true;
        const { container } = render(<Layout><div /></Layout>);
        const layoutDiv = container.firstElementChild;
        expect(layoutDiv).toHaveAttribute('data-sidebar-pinned', 'true');
    });

    it('should set data-sidebar-pinned="false" when unpinned', () => {
        mockIsPinned = false;
        const { container } = render(<Layout><div /></Layout>);
        const layoutDiv = container.firstElementChild;
        expect(layoutDiv).toHaveAttribute('data-sidebar-pinned', 'false');
    });

    it('should set data-sidebar-open="false" when hover is closed', () => {
        mockIsPinned = false;
        mockIsHoverOpen = false;
        const { container } = render(<Layout><div /></Layout>);
        const layoutDiv = container.firstElementChild;
        expect(layoutDiv).toHaveAttribute('data-sidebar-open', 'false');
    });

    it('should set data-sidebar-open="true" when hover is open', () => {
        mockIsPinned = false;
        mockIsHoverOpen = true;
        const { container } = render(<Layout><div /></Layout>);
        const layoutDiv = container.firstElementChild;
        expect(layoutDiv).toHaveAttribute('data-sidebar-open', 'true');
    });

    it('should always render the topbar header', () => {
        mockIsPinned = false;
        render(<Layout><div /></Layout>);
        expect(screen.getByTestId('search-bar')).toBeInTheDocument();
        expect(screen.getByTestId('workspace-controls')).toBeInTheDocument();
    });

    it('should render sidebar with data-pinned attribute', () => {
        mockIsPinned = false;
        const { container } = render(<Layout><div /></Layout>);
        const aside = container.querySelector('aside');
        expect(aside).toHaveAttribute('data-pinned', 'false');
    });

    it('should render sidebar with data-pinned true when pinned', () => {
        mockIsPinned = true;
        const { container } = render(<Layout><div /></Layout>);
        const aside = container.querySelector('aside');
        expect(aside).toHaveAttribute('data-pinned', 'true');
    });

    it('should have sidebar trigger zone wrapper when unpinned', () => {
        mockIsPinned = false;
        const { container } = render(<Layout><div /></Layout>);
        const triggerZone = container.querySelector('[data-testid="sidebar-trigger-zone"]');
        expect(triggerZone).toBeInTheDocument();
    });

    it('should render app name in sidebar', () => {
        render(<Layout><div /></Layout>);
        expect(screen.getByText(strings.app.name)).toBeInTheDocument();
    });

    describe('sidebar ARIA attributes', () => {
        it('should have descriptive aria-label on sidebar aside', () => {
            const { container } = render(<Layout><div /></Layout>);
            const aside = container.querySelector('aside');
            expect(aside).toHaveAttribute('aria-label', strings.sidebar.ariaLabel);
        });

        it('should have aria-expanded on pin toggle button when pinned', () => {
            mockIsPinned = true;
            render(<Layout><div /></Layout>);
            const pinButton = screen.getByLabelText(strings.sidebar.unpin);
            expect(pinButton).toHaveAttribute('aria-expanded', 'true');
        });

        it('should have aria-expanded false on pin button when unpinned and closed', () => {
            mockIsPinned = false;
            mockIsHoverOpen = false;
            render(<Layout><div /></Layout>);
            const pinButton = screen.getByLabelText(strings.sidebar.pin);
            expect(pinButton).toHaveAttribute('aria-expanded', 'false');
        });

        it('should have aria-expanded true on pin button when unpinned and hover open', () => {
            mockIsPinned = false;
            mockIsHoverOpen = true;
            render(<Layout><div /></Layout>);
            const pinButton = screen.getByLabelText(strings.sidebar.pin);
            expect(pinButton).toHaveAttribute('aria-expanded', 'true');
        });
    });
});
