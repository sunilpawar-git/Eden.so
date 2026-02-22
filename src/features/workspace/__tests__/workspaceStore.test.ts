/**
 * Workspace Store Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore, DEFAULT_WORKSPACE_ID } from '../stores/workspaceStore';
import type { Workspace } from '../types/workspace';

describe('WorkspaceStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        useWorkspaceStore.setState({
            currentWorkspaceId: DEFAULT_WORKSPACE_ID,
            workspaces: [],
            isLoading: false,
        });
    });

    describe('initial state', () => {
        it('should have default workspace ID', () => {
            const { currentWorkspaceId } = useWorkspaceStore.getState();
            expect(currentWorkspaceId).toBe(DEFAULT_WORKSPACE_ID);
        });

        it('should have empty workspaces list', () => {
            const { workspaces } = useWorkspaceStore.getState();
            expect(workspaces).toEqual([]);
        });

        it('should not be loading initially', () => {
            const { isLoading } = useWorkspaceStore.getState();
            expect(isLoading).toBe(false);
        });
    });

    describe('setCurrentWorkspaceId', () => {
        it('should update current workspace ID', () => {
            const { setCurrentWorkspaceId } = useWorkspaceStore.getState();

            setCurrentWorkspaceId('new-workspace-id');

            expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('new-workspace-id');
        });

        it('should allow setting to null', () => {
            const { setCurrentWorkspaceId } = useWorkspaceStore.getState();

            setCurrentWorkspaceId(null);

            expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
        });
    });

    describe('setWorkspaces', () => {
        it('should set workspaces list', () => {
            const { setWorkspaces } = useWorkspaceStore.getState();
            const mockWorkspaces: Workspace[] = [
                {
                    id: 'ws-1',
                    userId: 'user-1',
                    name: 'Workspace 1',
                    canvasSettings: { backgroundColor: 'grid' },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            setWorkspaces(mockWorkspaces);

            expect(useWorkspaceStore.getState().workspaces).toEqual(mockWorkspaces);
        });

        it('should load workspaces sorted by orderIndex', () => {
            const { setWorkspaces } = useWorkspaceStore.getState();
            const mockWorkspaces: Workspace[] = [
                { id: '1', name: 'ws 1', orderIndex: 3 } as Workspace,
                { id: '2', name: 'ws 2', orderIndex: 1 } as Workspace,
                { id: '3', name: 'ws 3', orderIndex: 2 } as Workspace,
            ];

            setWorkspaces(mockWorkspaces);

            const { workspaces } = useWorkspaceStore.getState();
            expect(workspaces[0]?.id).toBe('2');
            expect(workspaces[1]?.id).toBe('3');
            expect(workspaces[2]?.id).toBe('1');
        });
    });

    describe('addWorkspace', () => {
        it('should add a workspace to the list', () => {
            const { addWorkspace } = useWorkspaceStore.getState();
            const newWorkspace: Workspace = {
                id: 'ws-new',
                userId: 'user-1',
                name: 'New Workspace',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            addWorkspace(newWorkspace);

            const { workspaces } = useWorkspaceStore.getState();
            expect(workspaces).toHaveLength(1);
            expect(workspaces[0]).toEqual(newWorkspace);
        });
    });

    describe('updateWorkspace', () => {
        it('should update workspace name', () => {
            const { setWorkspaces, updateWorkspace } = useWorkspaceStore.getState();
            const workspace: Workspace = {
                id: 'ws-1',
                userId: 'user-1',
                name: 'Old Name',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            setWorkspaces([workspace]);

            updateWorkspace('ws-1', { name: 'New Name' });

            const { workspaces } = useWorkspaceStore.getState();
            expect(workspaces[0]?.name).toBe('New Name');
        });
    });

    describe('removeWorkspace', () => {
        it('should remove workspace from list', () => {
            const { setWorkspaces, removeWorkspace } = useWorkspaceStore.getState();
            const workspace: Workspace = {
                id: 'ws-1',
                userId: 'user-1',
                name: 'Workspace 1',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            setWorkspaces([workspace]);

            removeWorkspace('ws-1');

            expect(useWorkspaceStore.getState().workspaces).toHaveLength(0);
        });

        it('should reset to default workspace if current is removed', () => {
            const { setWorkspaces, setCurrentWorkspaceId, removeWorkspace } = useWorkspaceStore.getState();
            const workspace: Workspace = {
                id: 'ws-1',
                userId: 'user-1',
                name: 'Workspace 1',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            setWorkspaces([workspace]);
            setCurrentWorkspaceId('ws-1');

            removeWorkspace('ws-1');

            expect(useWorkspaceStore.getState().currentWorkspaceId).toBe(DEFAULT_WORKSPACE_ID);
        });
    });

    describe('reorderWorkspaces', () => {
        it('should correctly move an item and reassign orderIndices', () => {
            const { setWorkspaces, reorderWorkspaces } = useWorkspaceStore.getState();
            const mockWorkspaces: Workspace[] = [
                { id: '1', name: 'A', orderIndex: 0 } as Workspace,
                { id: '2', name: 'B', orderIndex: 1 } as Workspace,
                { id: '3', name: 'C', orderIndex: 2 } as Workspace,
            ];
            setWorkspaces(mockWorkspaces);

            // Move '1' from index 0 to index 2
            reorderWorkspaces(0, 2);

            const { workspaces } = useWorkspaceStore.getState();
            expect(workspaces).toHaveLength(3);
            expect(workspaces[0]?.id).toBe('2');
            expect(workspaces[0]?.orderIndex).toBe(0);

            expect(workspaces[1]?.id).toBe('3');
            expect(workspaces[1]?.orderIndex).toBe(1);

            expect(workspaces[2]?.id).toBe('1');
            expect(workspaces[2]?.orderIndex).toBe(2);
        });

        it('should cleanly handle out of bounds or invalid indices silently', () => {
            const { setWorkspaces, reorderWorkspaces } = useWorkspaceStore.getState();
            const mockWorkspaces: Workspace[] = [
                { id: '1', name: 'A', orderIndex: 0 } as Workspace,
            ];
            setWorkspaces(mockWorkspaces);

            reorderWorkspaces(5, 0); // Invalid source

            const { workspaces } = useWorkspaceStore.getState();
            expect(workspaces).toHaveLength(1);
            expect(workspaces[0]?.id).toBe('1');
        });
    });

    describe('node count actions', () => {
        it('should set node count for a specific workspace', () => {
            const { setWorkspaces, setNodeCount } = useWorkspaceStore.getState();
            const mockWorkspaces: Workspace[] = [
                { id: 'ws-1', name: 'WS 1' } as Workspace,
                { id: 'ws-2', name: 'WS 2' } as Workspace,
            ];
            setWorkspaces(mockWorkspaces);

            setNodeCount('ws-1', 5);

            const { workspaces } = useWorkspaceStore.getState();
            expect(workspaces.find((ws) => ws.id === 'ws-1')?.nodeCount).toBe(5);
            expect(workspaces.find((ws) => ws.id === 'ws-2')?.nodeCount).toBeUndefined();
        });
    });
});
