/**
 * WorkspaceControls Delete Tests - Delete workspace button behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WorkspaceControls } from '../WorkspaceControls';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '../../stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { strings } from '@/shared/localization/strings';
import { deleteWorkspace } from '../../services/workspaceService';

vi.mock('../../services/workspaceService', () => ({
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
}));

const mockConfirm = vi.fn().mockResolvedValue(false);
vi.mock('@/shared/stores/confirmStore', () => ({
    useConfirm: () => mockConfirm,
    useConfirmStore: vi.fn(),
}));

const mockPanToPosition = vi.fn();
vi.mock('@/features/canvas/hooks/usePanToNode', () => ({
    usePanToNode: () => ({
        panToPosition: mockPanToPosition,
    }),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('WorkspaceControls - Delete Workspace', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        useAuthStore.setState({
            user: {
                id: 'test-user-id',
                email: 'test@example.com',
                name: 'Test User',
                avatarUrl: '',
                createdAt: new Date(),
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
        });

        useWorkspaceStore.setState({
            currentWorkspaceId: 'workspace-1',
            workspaces: [
                {
                    id: 'workspace-1',
                    userId: 'test-user-id',
                    name: 'Test Workspace',
                    canvasSettings: { backgroundColor: 'grid' },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            isLoading: false,
            isSwitching: false,
        });

        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });

        useSettingsStore.setState({ canvasFreeFlow: false });
        mockConfirm.mockResolvedValue(false);
    });

    it('should show error toast when trying to delete default workspace', async () => {
        const { toast } = await import('@/shared/stores/toastStore');
        useWorkspaceStore.setState({ currentWorkspaceId: DEFAULT_WORKSPACE_ID });

        render(<WorkspaceControls />);

        const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        expect(toast.error).toHaveBeenCalledWith(strings.workspace.deleteDefaultError);
    });

    it('should show confirmation dialog when deleting non-default workspace', async () => {
        render(<WorkspaceControls />);

        const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({
            message: strings.workspace.deleteConfirm,
            isDestructive: true,
        }));
    });

    it('should not delete workspace when confirmation is cancelled', async () => {
        mockConfirm.mockResolvedValue(false);

        render(<WorkspaceControls />);

        const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        expect(deleteWorkspace).not.toHaveBeenCalled();
    });

    it('should delete workspace when confirmed', async () => {
        const { toast } = await import('@/shared/stores/toastStore');
        mockConfirm.mockResolvedValue(true);

        render(<WorkspaceControls />);

        const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        await waitFor(() => {
            expect(deleteWorkspace).toHaveBeenCalledWith('test-user-id', 'workspace-1');
        });

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(strings.workspace.deleteSuccess);
        });
    });

    it('should not work when user is not authenticated', () => {
        useAuthStore.setState({ user: null, isAuthenticated: false });

        render(<WorkspaceControls />);

        const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
        fireEvent.click(deleteButton);

        expect(mockConfirm).not.toHaveBeenCalled();
    });
});
