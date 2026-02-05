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
    updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
    removeWorkspace: (workspaceId: string) => void;
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
        set({ workspaces });
    },

    addWorkspace: (workspace: Workspace) => {
        set((state) => ({
            workspaces: [...state.workspaces, workspace],
        }));
    },

    updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => {
        set((state) => ({
            workspaces: state.workspaces.map((ws) =>
                ws.id === workspaceId ? { ...ws, ...updates } : ws
            ),
        }));
    },

    removeWorkspace: (workspaceId: string) => {
        set((state) => ({
            workspaces: state.workspaces.filter((ws) => ws.id !== workspaceId),
            // Reset to default if current workspace is removed
            currentWorkspaceId:
                state.currentWorkspaceId === workspaceId
                    ? DEFAULT_WORKSPACE_ID
                    : state.currentWorkspaceId,
        }));
    },

    setLoading: (isLoading: boolean) => {
        set({ isLoading });
    },

    setSwitching: (isSwitching: boolean) => {
        set({ isSwitching });
    },
}));

export { DEFAULT_WORKSPACE_ID };
