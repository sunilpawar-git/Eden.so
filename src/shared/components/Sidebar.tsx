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
import { toast } from '@/shared/stores/toastStore';
import styles from './Sidebar.module.css';

interface WorkspaceItemProps {
    id: string;
    name: string;
    isActive: boolean;
    onSelect: (id: string) => void;
    onRename: (id: string, newName: string) => void;
}

function WorkspaceItem({ id, name, isActive, onSelect, onRename }: WorkspaceItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);

    const handleDoubleClick = () => {
        setIsEditing(true);
        setEditName(name);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editName.trim() && editName !== name) {
            onRename(id, editName.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName(name);
        }
    };

    return (
        <div
            className={`${styles.workspaceItem} ${isActive ? styles.active : ''}`}
            onClick={() => !isEditing && onSelect(id)}
        >
            {isEditing ? (
                <input
                    type="text"
                    className={styles.workspaceNameInput}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                <span 
                    className={styles.workspaceName}
                    onDoubleClick={handleDoubleClick}
                >
                    {name}
                </span>
            )}
        </div>
    );
}

export function Sidebar() {
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
    const [isCreating, setIsCreating] = useState(false);

    // Load workspaces on mount
    useEffect(() => {
        if (!user) return;

        async function loadWorkspaces() {
            try {
                const loadedWorkspaces = await loadUserWorkspaces(user!.id);
                setWorkspaces(loadedWorkspaces);

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
            } catch (error) {
                console.error('[Sidebar] Failed to load workspaces:', error);
            }
        }

        loadWorkspaces();
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
        if (workspaceId === currentWorkspaceId || !user) return;
        
        // 1. Save current workspace BEFORE clearing
        const currentNodes = useCanvasStore.getState().nodes;
        const currentEdges = useCanvasStore.getState().edges;
        
        if (currentWorkspaceId && (currentNodes.length > 0 || currentEdges.length > 0)) {
            try {
                await Promise.all([
                    saveNodes(user.id, currentWorkspaceId, currentNodes),
                    saveEdges(user.id, currentWorkspaceId, currentEdges),
                ]);
            } catch (error) {
                console.error('[Sidebar] Failed to save workspace before switching:', error);
                // Continue with switch even if save fails
            }
        }
        
        // 2. Now safe to clear and switch
        clearCanvas();
        setCurrentWorkspaceId(workspaceId);
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
                    <span className={styles.plusIcon}>+</span>
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
                )}
            </div>
        </aside>
    );
}
