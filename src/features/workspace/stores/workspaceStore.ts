/**
 * Workspace Store - ViewModel for workspace state
 * Manages current workspace and workspace list
 */
import { create } from 'zustand';
import type { Workspace } from '../types/workspace';

interface WorkspaceState {
    currentWorkspaceId: string | null;
    workspaces: Workspace[];
    isLoading: boolean;
    isSwitching: boolean;
}

interface WorkspaceActions {
    setCurrentWorkspaceId: (workspaceId: string | null) => void;
    setWorkspaces: (workspaces: Workspace[]) => void;
    addWorkspace: (workspace: Workspace) => void;
    insertWorkspaceAfter: (workspace: Workspace, targetWorkspaceId: string) => void;
    updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
    removeWorkspace: (workspaceId: string) => void;
    reorderWorkspaces: (sourceIndex: number, destinationIndex: number) => void;
    setLoading: (isLoading: boolean) => void;
    setSwitching: (isSwitching: boolean) => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

const DEFAULT_WORKSPACE_ID = 'default-workspace';

const initialState: WorkspaceState = {
    currentWorkspaceId: DEFAULT_WORKSPACE_ID,
    workspaces: [],
    isLoading: false,
    isSwitching: false,
};

export const useWorkspaceStore = create<WorkspaceStore>()((set) => ({
    ...initialState,

    setCurrentWorkspaceId: (workspaceId: string | null) => {
        set({ currentWorkspaceId: workspaceId });
    },

    setWorkspaces: (workspaces: Workspace[]) => {
        // Ensure workspaces are loaded sorted by orderIndex
        const sorted = [...workspaces].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        set({ workspaces: sorted });
    },

    addWorkspace: (workspace: Workspace) => {
        set((state) => ({
            workspaces: [...state.workspaces, workspace],
        }));
    },

    insertWorkspaceAfter: (workspace: Workspace, targetWorkspaceId: string) => {
        set((state) => {
            const targetIndex = state.workspaces.findIndex((ws) => ws.id === targetWorkspaceId);
            if (targetIndex === -1) {
                // Fallback to append if target not found
                return { workspaces: [...state.workspaces, workspace] };
            }

            const newWorkspaces = [...state.workspaces];
            newWorkspaces.splice(targetIndex + 1, 0, workspace);

            // Re-assign order indices for all workspaces to ensure consistency
            const updatedWorkspaces = newWorkspaces.map((ws, i) => ({
                ...ws,
                orderIndex: i,
            }));

            return { workspaces: updatedWorkspaces };
        });
    },

    updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => {
        set((state) => ({
            workspaces: state.workspaces.map((ws) =>
                ws.id === workspaceId ? { ...ws, ...updates } : ws
            ),
        }));
    },

    removeWorkspace: (workspaceId: string) => {
        set((state) => {
            const nextWorkspaces = state.workspaces.filter((ws) => ws.id !== workspaceId);

            // If we are deleting the current workspace, find a valid fallback
            let nextWorkspaceId = state.currentWorkspaceId;
            if (state.currentWorkspaceId === workspaceId) {
                const fallbackWorkspace = nextWorkspaces.find((ws) => ws.type !== 'divider');
                nextWorkspaceId = fallbackWorkspace ? fallbackWorkspace.id : DEFAULT_WORKSPACE_ID;
            }

            return {
                workspaces: nextWorkspaces,
                currentWorkspaceId: nextWorkspaceId,
            };
        });
    },

    reorderWorkspaces: (sourceIndex: number, destinationIndex: number) => {
        set((state) => {
            const newWorkspaces = [...state.workspaces];
            const [movedItem] = newWorkspaces.splice(sourceIndex, 1);
            if (!movedItem) return state;
            newWorkspaces.splice(destinationIndex, 0, movedItem);

            // Assign sequential order indices to preserve the new order
            const updatedWorkspaces = newWorkspaces.map((ws, i) => ({
                ...ws,
                orderIndex: i,
            }));

            return { workspaces: updatedWorkspaces };
        });
    },

    setLoading: (isLoading: boolean) => {
        set({ isLoading });
    },

    setSwitching: (isSwitching: boolean) => {
        set({ isSwitching });
    },
}));

export { DEFAULT_WORKSPACE_ID };
