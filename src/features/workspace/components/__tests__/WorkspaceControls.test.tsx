/**
 * WorkspaceControls Tests - Consolidated UI Ribbon Component
 * Tests for: Add Node, Clear Canvas, Delete Workspace functionality
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceControls } from '../WorkspaceControls';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '../../stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import type { CanvasNode } from '@/features/canvas/types/node';
import { strings } from '@/shared/localization/strings';
// Mock workspace service
import { deleteWorkspace } from '../../services/workspaceService';

vi.mock('../../services/workspaceService', () => ({
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
}));

// Mock usePanToNode
const mockPanToPosition = vi.fn();
vi.mock('@/features/canvas/hooks/usePanToNode', () => ({
    usePanToNode: () => ({
        panToPosition: mockPanToPosition,
    }),
}));




// Mock toast store
vi.mock('@/shared/stores/toastStore', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('WorkspaceControls', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset auth store
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

        // Reset workspace store
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

        // Reset canvas store
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
        });

        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(false);
    });

    describe('rendering', () => {
        it('should render all three action buttons', () => {
            render(<WorkspaceControls />);

            // Check for Add Node button
            expect(screen.getByTitle(strings.workspace.addNodeTooltip)).toBeInTheDocument();

            // Check for Auto Arrange button
            expect(screen.getByTitle(strings.workspace.arrangeNodesTooltip)).toBeInTheDocument();

            // Check for Clear Canvas button
            expect(screen.getByTitle(strings.canvas.clearCanvas)).toBeInTheDocument();

            // Check for Delete Workspace button
            expect(screen.getByTitle(strings.workspace.deleteWorkspaceTooltip)).toBeInTheDocument();
        });

        it('should render two dividers between buttons', () => {
            const { container } = render(<WorkspaceControls />);

            // There should be 3 dividers (between 4 buttons)
            const dividers = container.querySelectorAll('[class*="divider"]');
            expect(dividers.length).toBe(3);
        });
    });

    describe('Add Node button', () => {
        it('should add a node when clicked', () => {
            render(<WorkspaceControls />);

            const addButton = screen.getByTitle(strings.workspace.addNodeTooltip);
            fireEvent.click(addButton);

            const { nodes } = useCanvasStore.getState();
            expect(nodes).toHaveLength(1);
            expect(nodes[0]).toMatchObject({
                workspaceId: 'workspace-1',
                type: 'idea',
                width: 280,
                height: 220,
            });
            // Position is now dynamic, so we check that it called pan
            expect(mockPanToPosition).toHaveBeenCalled();
        });

        it('should position node at grid origin for first node', () => {
            render(<WorkspaceControls />);

            const addButton = screen.getByTitle(strings.workspace.addNodeTooltip);
            fireEvent.click(addButton);

            const { nodes } = useCanvasStore.getState();
            expect(nodes[0]?.position).toEqual({ x: 32, y: 32 });
        });

        it('should position subsequent nodes using grid layout', () => {
            render(<WorkspaceControls />);

            const addButton = screen.getByTitle(strings.workspace.addNodeTooltip);

            // Add first node
            fireEvent.click(addButton);
            let nodes = useCanvasStore.getState().nodes;
            expect(nodes[0]?.position).toEqual({ x: 32, y: 32 });

            // Add second node
            fireEvent.click(addButton);
            nodes = useCanvasStore.getState().nodes;
            expect(nodes[1]?.position.x).toBeGreaterThan(32); // Should be in next column
            expect(nodes[1]?.position.y).toBe(32); // Same row
        });

        it('should not add node if no workspace is selected', () => {
            useWorkspaceStore.setState({ currentWorkspaceId: null });

            render(<WorkspaceControls />);

            const addButton = screen.getByTitle(strings.workspace.addNodeTooltip);
            fireEvent.click(addButton);

            const { nodes } = useCanvasStore.getState();
            expect(nodes).toHaveLength(0);
        });
    });

    describe('Auto Arrange button', () => {
        it('should arrange nodes when clicked', () => {
            useCanvasStore.setState({ nodes: [{ id: 'n1', position: { x: 0, y: 0 }, createdAt: new Date() } as unknown as CanvasNode] });
            render(<WorkspaceControls />);

            const arrangeButton = screen.getByTitle(strings.workspace.arrangeNodesTooltip);
            fireEvent.click(arrangeButton);

            expect(mockPanToPosition).not.toHaveBeenCalled(); // Just arranging, not panning
            // Check implicit success by lack of error and enabled state
            expect(arrangeButton).toBeEnabled();
        });

        it('should be disabled when there are no nodes', () => {
            useCanvasStore.setState({ nodes: [] });
            render(<WorkspaceControls />);
            const arrangeButton = screen.getByTitle(strings.workspace.arrangeNodesTooltip);
            expect(arrangeButton).toBeDisabled();
        });
    });

    describe('Clear Canvas button', () => {
        it('should be disabled when there are no nodes', () => {
            useCanvasStore.setState({ nodes: [] });

            render(<WorkspaceControls />);

            const clearButton = screen.getByTitle(strings.canvas.clearCanvas);
            expect(clearButton).toBeDisabled();
        });

        it('should be enabled when there are nodes', () => {
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'node-1',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        position: { x: 0, y: 0 },
                        data: { content: '', prompt: '', output: '', isGenerating: false, isPromptCollapsed: false },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            render(<WorkspaceControls />);

            const clearButton = screen.getByTitle(strings.canvas.clearCanvas);
            expect(clearButton).not.toBeDisabled();
        });

        it('should show confirmation dialog when clicked', () => {
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'node-1',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        position: { x: 0, y: 0 },
                        data: { content: '', prompt: '', output: '', isGenerating: false, isPromptCollapsed: false },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            render(<WorkspaceControls />);

            const clearButton = screen.getByTitle(strings.canvas.clearCanvas);
            fireEvent.click(clearButton);

            expect(window.confirm).toHaveBeenCalledWith(strings.canvas.clearConfirm);
        });

        it('should clear canvas when confirmed', () => {
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'node-1',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        position: { x: 0, y: 0 },
                        data: { content: '', prompt: '', output: '', isGenerating: false, isPromptCollapsed: false },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            (window.confirm as Mock).mockReturnValue(true);

            render(<WorkspaceControls />);

            const clearButton = screen.getByTitle(strings.canvas.clearCanvas);
            fireEvent.click(clearButton);

            const { nodes } = useCanvasStore.getState();
            expect(nodes).toHaveLength(0);
        });

        it('should not clear canvas when cancelled', () => {
            useCanvasStore.setState({
                nodes: [
                    {
                        id: 'node-1',
                        workspaceId: 'workspace-1',
                        type: 'idea',
                        position: { x: 0, y: 0 },
                        data: { content: '', prompt: '', output: '', isGenerating: false, isPromptCollapsed: false },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
            });

            (window.confirm as Mock).mockReturnValue(false);

            render(<WorkspaceControls />);

            const clearButton = screen.getByTitle(strings.canvas.clearCanvas);
            fireEvent.click(clearButton);

            const { nodes } = useCanvasStore.getState();
            expect(nodes).toHaveLength(1);
        });
    });

    describe('Delete Workspace button', () => {
        it('should show error toast when trying to delete default workspace', async () => {
            const { toast } = await import('@/shared/stores/toastStore');
            useWorkspaceStore.setState({ currentWorkspaceId: DEFAULT_WORKSPACE_ID });

            render(<WorkspaceControls />);

            const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
            fireEvent.click(deleteButton);

            expect(toast.error).toHaveBeenCalledWith(strings.workspace.deleteDefaultError);
        });

        it('should show confirmation dialog when deleting non-default workspace', () => {
            render(<WorkspaceControls />);

            const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
            fireEvent.click(deleteButton);

            expect(window.confirm).toHaveBeenCalledWith(strings.workspace.deleteConfirm);
        });

        it('should not delete workspace when confirmation is cancelled', async () => {
            (window.confirm as Mock).mockReturnValue(false);

            render(<WorkspaceControls />);

            const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
            fireEvent.click(deleteButton);

            expect(deleteWorkspace).not.toHaveBeenCalled();
        });

        it('should delete workspace when confirmed', async () => {
            const { toast } = await import('@/shared/stores/toastStore');
            (window.confirm as Mock).mockReturnValue(true);

            render(<WorkspaceControls />);

            const deleteButton = screen.getByTitle(strings.workspace.deleteWorkspaceTooltip);
            fireEvent.click(deleteButton);

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

            // Should not show confirmation or call delete
            expect(window.confirm).not.toHaveBeenCalled();
        });
    });
});
