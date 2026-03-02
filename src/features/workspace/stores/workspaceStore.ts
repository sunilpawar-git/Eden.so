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
    setNodeCount: (workspaceId: string, count: number) => void;
    removeWorkspace: (workspaceId: string) => void;
    reorderWorkspaces: (sourceIndex: number, destinationIndex: number) => void;
    toggleWorkspacePool: (workspaceId: string) => void;
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

    setCurrentWorkspaceId: (id: string | null) => set({ currentWorkspaceId: id }),

    setWorkspaces: (workspaces: Workspace[]) => {
        const sorted = [...workspaces].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        set({ workspaces: sorted });
    },

    addWorkspace: (workspace: Workspace) => {
        set((state) => ({ workspaces: [...state.workspaces, workspace] }));
    },

    insertWorkspaceAfter: (workspace: Workspace, targetId: string) => {
        set((state) => {
            const index = state.workspaces.findIndex((ws) => ws.id === targetId);
            if (index === -1) return { workspaces: [...state.workspaces, workspace] };

            const list = [...state.workspaces];
            list.splice(index + 1, 0, workspace);
            return { workspaces: list.map((ws, i) => ({ ...ws, orderIndex: i })) };
        });
    },

    updateWorkspace: (id: string, updates: Partial<Workspace>) => {
        set((state) => ({
            workspaces: state.workspaces.map((ws) => (ws.id === id ? { ...ws, ...updates } : ws)),
        }));
    },

    setNodeCount: (id: string, count: number) => {
        set((state) => ({
            workspaces: state.workspaces.map((ws) => (ws.id === id ? { ...ws, nodeCount: count } : ws)),
        }));
    },

    removeWorkspace: (id: string) => {
        set((state) => {
            const list = state.workspaces.filter((ws) => ws.id !== id);
            let nextId = state.currentWorkspaceId;
            if (state.currentWorkspaceId === id) {
                const fb = list.find((ws) => ws.type !== 'divider');
                nextId = fb ? fb.id : DEFAULT_WORKSPACE_ID;
            }
            return { workspaces: list, currentWorkspaceId: nextId };
        });
    },

    reorderWorkspaces: (src: number, dest: number) => {
        set((state) => {
            const list = [...state.workspaces];
            const [item] = list.splice(src, 1);
            if (!item) return state;
            list.splice(dest, 0, item);
            return { workspaces: list.map((ws, i) => ({ ...ws, orderIndex: i })) };
        });
    },

    toggleWorkspacePool: (workspaceId: string) =>
        set((state) => ({
            workspaces: state.workspaces.map((ws) =>
                ws.id === workspaceId
                    ? { ...ws, includeAllNodesInPool: !(ws.includeAllNodesInPool ?? false), updatedAt: new Date() }
                    : ws
            ),
        })),

    setLoading: (isLoading: boolean) => set({ isLoading }),
    setSwitching: (isSwitching: boolean) => set({ isSwitching }),
}));

export { DEFAULT_WORKSPACE_ID };
