/**
 * Sidebar Component - Workspace list and navigation
 */
import { useState, useEffect } from 'react';
import { strings } from '@/shared/localization/strings';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { signOut } from '@/features/auth/services/authService';
import { 
    createNewWorkspace, 
    loadUserWorkspaces,
    saveWorkspace,
    saveNodes,
    saveEdges 
} from '@/features/workspace/services/workspaceService';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { indexedDbService, IDB_STORES } from '@/shared/services/indexedDbService';
import { toast } from '@/shared/stores/toastStore';
import { PlusIcon, SettingsIcon } from '@/shared/components/icons';
import { WorkspaceItem } from './WorkspaceItem';
import styles from './Sidebar.module.css';

interface SidebarProps {
    onSettingsClick?: () => void;
}

// eslint-disable-next-line max-lines-per-function -- sidebar with workspace management
export function Sidebar({ onSettingsClick }: SidebarProps) {
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

    // Load workspaces on mount
    useEffect(() => {
        if (!user) return;
        const userId = user.id;

        async function loadWorkspaces() {
            // Hydrate in-memory cache from IDB on startup
            await workspaceCache.hydrateFromIdb();

            try {
                const loadedWorkspaces = await loadUserWorkspaces(userId);
                setWorkspaces(loadedWorkspaces);

                // Persist workspace metadata to IDB for offline fallback
                const metadata = loadedWorkspaces.map((ws) => ({
                    id: ws.id,
                    name: ws.name,
                    updatedAt: Date.now(),
                }));
                void indexedDbService.put(
                    IDB_STORES.metadata, '__workspace_metadata__', metadata
                );

                // Auto-select first workspace if current doesn't exist in loaded list
                const firstWorkspace = loadedWorkspaces[0];
                if (firstWorkspace) {
                    const currentExists = loadedWorkspaces.some(
                        (ws) => ws.id === currentWorkspaceId
                    );
                    if (!currentExists) {
                        setCurrentWorkspaceId(firstWorkspace.id);
                    }
                }

                // Preload all workspaces into cache for instant switching
                if (loadedWorkspaces.length > 0) {
                    const workspaceIds = loadedWorkspaces.map((ws) => ws.id);
                    void workspaceCache.preload(userId, workspaceIds).catch((err: unknown) => {
                        console.warn('[Sidebar] Cache preload failed:', err);
                    });
                }
            } catch (error) {
                console.error('[Sidebar] Failed to load workspaces:', error);
                // Fallback: try loading from IDB metadata when offline
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
            // Save current workspace before switching
            const currentNodes = useCanvasStore.getState().nodes;
            const currentEdges = useCanvasStore.getState().edges;
            
            if (currentWorkspaceId && (currentNodes.length > 0 || currentEdges.length > 0)) {
                await Promise.all([
                    saveNodes(user.id, currentWorkspaceId, currentNodes),
                    saveEdges(user.id, currentWorkspaceId, currentEdges),
                ]);
            }
            
            const workspace = await createNewWorkspace(user.id);
            // Add workspace to store and switch to it
            addWorkspace(workspace);
            setCurrentWorkspaceId(workspace.id);
            // Clear the canvas for the new workspace
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
            // Use atomic switcher: prefetch → swap → update ID (no clearCanvas)
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
            // Update local state
            updateWorkspace(workspaceId, { name: newName });
            // Persist to Firestore
            await saveWorkspace(user.id, { ...workspace, name: newName });
        } catch (error) {
            console.error('[Sidebar] Failed to rename workspace:', error);
            toast.error(strings.errors.generic);
        }
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <div className={styles.logo}>
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                        <path
                            d="M16 24L22 30L32 18"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <span className={styles.appName}>{strings.app.name}</span>
            </div>

            <div className={styles.workspaces}>
                <button 
                    className={styles.newWorkspace} 
                    onClick={handleNewWorkspace}
                    disabled={isCreating}
                >
                    <PlusIcon size={18} />
                    <span>{isCreating ? strings.common.loading : strings.workspace.newWorkspace}</span>
                </button>

                <div className={styles.workspaceList}>
                    {workspaces.length > 0 ? (
                        workspaces.map((ws) => (
                            <WorkspaceItem
                                key={ws.id}
                                id={ws.id}
                                name={ws.name}
                                isActive={ws.id === currentWorkspaceId}
                                onSelect={handleSelectWorkspace}
                                onRename={handleRenameWorkspace}
                            />
                        ))
                    ) : (
                        <div className={styles.workspaceItem}>
                            <span className={styles.workspaceName}>
                                {strings.workspace.untitled}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.footer}>
                {user && (
                    <div className={styles.footerContent}>
                        <div className={styles.userSection}>
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className={styles.avatar}
                                />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{user.name}</span>
                                <button
                                    className={styles.signOutButton}
                                    onClick={handleSignOut}
                                >
                                    {strings.auth.signOut}
                                </button>
                            </div>
                        </div>
                        <button
                            className={styles.settingsButton}
                            onClick={onSettingsClick}
                            aria-label={strings.settings.title}
                        >
                            <SettingsIcon size={20} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
