import { useState, useCallback, useEffect } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';
import {
    createNewWorkspace,
    loadUserWorkspaces,
    saveWorkspace,
    saveNodes,
    saveEdges
} from '@/features/workspace/services/workspaceService';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { indexedDbService, IDB_STORES } from '@/shared/services/indexedDbService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { signOut } from '@/features/auth/services/authService';

export function useSidebarViewModel() {
    const isSidebarPinned = useSettingsStore((s) => s.isSidebarPinned);
    const toggleSidebarPin = useSettingsStore((s) => s.toggleSidebarPin);
    const [isHovered, setIsHovered] = useState(false);

    // Workspace & Auth State
    const { user } = useAuthStore();
    const clearCanvas = useCanvasStore((s) => s.clearCanvas);
    const {
        currentWorkspaceId,
        workspaces,
        setCurrentWorkspaceId,
        addWorkspace,
        setWorkspaces,
        updateWorkspace
    } = useWorkspaceStore();
    const { switchWorkspace } = useWorkspaceSwitcher();
    const [isCreating, setIsCreating] = useState(false);

    // Sidebar is expanded if it's pinned OR if it's hovered (when unpinned)
    const isExpanded = isSidebarPinned || isHovered;

    const onMouseEnter = useCallback(() => {
        if (!isSidebarPinned) {
            setIsHovered(true);
        }
    }, [isSidebarPinned]);

    const onMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    // Load workspaces on mount
    useEffect(() => {
        if (!user) return;
        const userId = user.id;

        async function loadWorkspaces() {
            await workspaceCache.hydrateFromIdb();

            try {
                const loadedWorkspaces = await loadUserWorkspaces(userId);
                setWorkspaces(loadedWorkspaces);

                const metadata = loadedWorkspaces.map((ws) => ({
                    id: ws.id,
                    name: ws.name,
                    updatedAt: Date.now(),
                }));
                void indexedDbService.put(
                    IDB_STORES.metadata, '__workspace_metadata__', metadata
                );

                const firstWorkspace = loadedWorkspaces[0];
                if (firstWorkspace) {
                    const currentExists = loadedWorkspaces.some(
                        (ws) => ws.id === currentWorkspaceId
                    );
                    if (!currentExists) {
                        setCurrentWorkspaceId(firstWorkspace.id);
                    }
                }

                if (loadedWorkspaces.length > 0) {
                    const workspaceIds = loadedWorkspaces.map((ws) => ws.id);
                    void workspaceCache.preload(userId, workspaceIds).catch((err: unknown) => {
                        console.warn('[Sidebar] Cache preload failed:', err);
                    });
                }
            } catch (error) {
                console.error('[Sidebar] Failed to load workspaces:', error);
                const cachedMetadata = await indexedDbService.get<
                    Array<{ id: string; name: string; updatedAt: number }>
                >(IDB_STORES.metadata, '__workspace_metadata__');
                if (cachedMetadata && cachedMetadata.length > 0) {
                    setWorkspaces(
                        cachedMetadata.map((meta) => ({
                            id: meta.id,
                            userId,
                            name: meta.name,
                            canvasSettings: { backgroundColor: 'white' as const },
                            createdAt: new Date(meta.updatedAt),
                            updatedAt: new Date(meta.updatedAt),
                        }))
                    );
                }
            }
        }

        void loadWorkspaces();
    }, [user, setWorkspaces, currentWorkspaceId, setCurrentWorkspaceId]);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch {
            // Error handled in service
        }
    };

    const handleNewWorkspace = async () => {
        if (!user || isCreating) return;

        setIsCreating(true);
        try {
            const currentNodes = useCanvasStore.getState().nodes;
            const currentEdges = useCanvasStore.getState().edges;

            if (currentWorkspaceId && (currentNodes.length > 0 || currentEdges.length > 0)) {
                await Promise.all([
                    saveNodes(user.id, currentWorkspaceId, currentNodes),
                    saveEdges(user.id, currentWorkspaceId, currentEdges),
                ]);
            }

            const workspace = await createNewWorkspace(user.id);
            addWorkspace(workspace);
            setCurrentWorkspaceId(workspace.id);
            clearCanvas();
            toast.success(`${strings.workspace.created}: ${workspace.name}`);
        } catch (error) {
            console.error('[Sidebar] Failed to create workspace:', error);
            toast.error(strings.errors.generic);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSelectWorkspace = async (workspaceId: string) => {
        if (workspaceId === currentWorkspaceId) return;

        try {
            await switchWorkspace(workspaceId);
        } catch (error) {
            console.error('[Sidebar] Failed to switch workspace:', error);
            toast.error(strings.workspace.switchError);
        }
    };

    const handleRenameWorkspace = async (workspaceId: string, newName: string) => {
        if (!user) return;

        const workspace = workspaces.find((ws) => ws.id === workspaceId);
        if (!workspace) return;

        try {
            updateWorkspace(workspaceId, { name: newName });
            await saveWorkspace(user.id, { ...workspace, name: newName });
        } catch (error) {
            console.error('[Sidebar] Failed to rename workspace:', error);
            toast.error(strings.errors.generic);
        }
    };

    return {
        isPinned: isSidebarPinned,
        isExpanded,
        togglePin: toggleSidebarPin,
        onMouseEnter,
        onMouseLeave,
        // Workspace data
        user,
        workspaces,
        currentWorkspaceId,
        isCreating,
        // Actions
        handleSignOut,
        handleNewWorkspace,
        handleSelectWorkspace,
        handleRenameWorkspace,
    };
}
