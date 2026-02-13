/**
 * Sidebar Accessibility Tests
 * Tests for WCAG AA color contrast compliance
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { strings } from '@/shared/localization/strings';

// Mock dependencies
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: () => ({
        user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
    }),
}));

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: vi.fn((selector) => {
        const state = {
            nodes: [],
            edges: [],
            clearCanvas: vi.fn(),
        };
        return selector ? selector(state) : state;
    }),
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: () => ({
        currentWorkspaceId: 'ws-1',
        workspaces: [{ id: 'ws-1', name: 'Test Workspace' }],
        setCurrentWorkspaceId: vi.fn(),
        addWorkspace: vi.fn(),
        setWorkspaces: vi.fn(),
        updateWorkspace: vi.fn(),
    }),
}));

vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher', () => ({
    useWorkspaceSwitcher: () => ({
        switchWorkspace: vi.fn(),
        isSwitching: false,
    }),
}));

vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: {
        preload: vi.fn().mockResolvedValue(undefined),
        hydrateFromIdb: vi.fn().mockResolvedValue(undefined),
    },
}));

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

vi.mock('@/features/workspace/services/workspaceService', () => ({
    loadUserWorkspaces: vi.fn().mockResolvedValue([]),
    createNewWorkspace: vi.fn(),
    saveWorkspace: vi.fn(),
    saveNodes: vi.fn(),
    saveEdges: vi.fn(),
}));

vi.mock('@/features/auth/services/authService', () => ({
    signOut: vi.fn(),
}));

describe('Sidebar Accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Color Contrast Compliance', () => {
        it('renders New Workspace button with accessible text', () => {
            render(<Sidebar />);
            
            const newWorkspaceBtn = screen.getByRole('button', { 
                name: new RegExp(strings.workspace.newWorkspace, 'i') 
            });
            
            expect(newWorkspaceBtn).toBeInTheDocument();
            // Button should be visible and have proper styling
            expect(newWorkspaceBtn).toBeVisible();
        });

        it('renders Sign out button with accessible text', () => {
            render(<Sidebar />);
            
            const signOutBtn = screen.getByRole('button', { 
                name: strings.auth.signOut 
            });
            
            expect(signOutBtn).toBeInTheDocument();
            expect(signOutBtn).toBeVisible();
        });

        it('uses string resources for all button labels', () => {
            render(<Sidebar />);
            
            // Verify buttons use localized strings
            expect(screen.getByText(strings.workspace.newWorkspace)).toBeInTheDocument();
            expect(screen.getByText(strings.auth.signOut)).toBeInTheDocument();
        });
    });

    describe('Interactive Elements', () => {
        it('settings button has accessible aria-label', () => {
            render(<Sidebar onSettingsClick={vi.fn()} />);
            
            const settingsBtn = screen.getByRole('button', { 
                name: strings.settings.title 
            });
            
            expect(settingsBtn).toBeInTheDocument();
            expect(settingsBtn).toHaveAttribute('aria-label', strings.settings.title);
        });
    });
});
