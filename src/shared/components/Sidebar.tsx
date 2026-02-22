/**
 * Sidebar Component - Workspace list and navigation
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { strings } from '@/shared/localization/strings';
import { useAuthStore } from '@/features/auth/stores/authStore';
import {
    createNewWorkspace, createNewDividerWorkspace, loadUserWorkspaces,
    saveWorkspace, saveNodes, saveEdges, updateWorkspaceOrder, deleteWorkspace
} from '@/features/workspace/services/workspaceService';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { indexedDbService, IDB_STORES } from '@/shared/services/indexedDbService';
import { toast } from '@/shared/stores/toastStore';
import { useConfirm } from '@/shared/stores/confirmStore';
import { useSidebarStore } from '@/shared/stores/sidebarStore';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import { PlusIcon, ChevronDownIcon } from '@/shared/components/icons';
import { WorkspaceList } from './WorkspaceList';
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
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
        insertWorkspaceAfter,
        setWorkspaces,
        updateWorkspace,
        reorderWorkspaces,
        removeWorkspace, // Added removeWorkspace
    } = useWorkspaceStore();
    const { switchWorkspace } = useWorkspaceSwitcher();
    const isPinned = useSidebarStore((s) => s.isPinned);
    const togglePin = useSidebarStore((s) => s.togglePin);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingDivider, setIsCreatingDivider] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useOutsideClick(dropdownRef, isDropdownOpen, () => setIsDropdownOpen(false));

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

                // Auto-select first real workspace if current doesn't exist in loaded list
                // Ignore dividers when falling back
                const firstRealWorkspace = loadedWorkspaces.find(ws => ws.type !== 'divider');
                if (firstRealWorkspace) {
                    const currentExists = loadedWorkspaces.some(
                        (ws) => ws.id === currentWorkspaceId
                    );
                    if (!currentExists) {
                        setCurrentWorkspaceId(firstRealWorkspace.id);
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

    const handleNewDivider = useCallback(async () => {
        if (!user || isCreatingDivider) return;
        setIsCreatingDivider(true);
        setIsDropdownOpen(false);
        try {
            const newDivider = await createNewDividerWorkspace(user.id);

            if (currentWorkspaceId) {
                // Determine insertion index based on current workspace
                const { workspaces: currentList } = useWorkspaceStore.getState();
                const targetIndex = currentList.findIndex(ws => ws.id === currentWorkspaceId);

                // Insert into Zustand
                insertWorkspaceAfter(newDivider, currentWorkspaceId);

                // We must also immediately persist the new order to Firestore
                // since insertWorkspaceAfter implicitly shifts all indices after it
                const { workspaces: updatedList } = useWorkspaceStore.getState();
                const updates = updatedList.map((ws, i) => ({
                    id: ws.id,
                    orderIndex: i
                }));

                await Promise.all([
                    saveWorkspace(user.id, { ...newDivider, orderIndex: targetIndex + 1 }),
                    updateWorkspaceOrder(user.id, updates)
                ]);
            } else {
                // Fallback to end of list
                addWorkspace(newDivider);
                // Note: saveWorkspace internally saves with the orderIndex we provided 
                // but if we are adding it to the end, the logic from createDivider () works fine
            }

            toast.success('Divider created');
        } catch (error) {
            console.error('[Sidebar] Failed to create divider:', error);
            toast.error(strings.errors.generic);
        } finally {
            setIsCreatingDivider(false);
        }
    }, [user, currentWorkspaceId, isCreatingDivider, addWorkspace, insertWorkspaceAfter]);

    const confirm = useConfirm();

    const handleDeleteDivider = useCallback(async (id: string) => {
        if (!user) return;
        const confirmed = await confirm({
            title: strings.workspace.deleteDividerTitle,
            message: strings.workspace.deleteDividerMessage,
            confirmText: strings.workspace.deleteDividerButton,
            isDestructive: true,
        });
        if (!confirmed) return;

        try {
            await deleteWorkspace(user.id, id);
            removeWorkspace(id);
        } catch (error) {
            console.error('[Sidebar] Failed to delete divider:', error);
            toast.error(strings.errors.generic);
        }
    }, [user, confirm, removeWorkspace]);

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

    const handleReorderWorkspace = async (sourceIndex: number, destinationIndex: number) => {
        if (!user || sourceIndex === destinationIndex) return;

        // 1. Optimistic local update
        reorderWorkspaces(sourceIndex, destinationIndex);

        // 2. Read the newly computed array state directly from the store
        const { workspaces: updatedWorkspaces } = useWorkspaceStore.getState();

        const updates = updatedWorkspaces.map((ws, index) => ({
            id: ws.id,
            orderIndex: index
        }));

        try {
            // 3. Persist to Firestore asynchronously
            await updateWorkspaceOrder(user.id, updates);
        } catch (error) {
            console.error('[Sidebar] Failed to save workspace order:', error);
            // Optionally, revert state if needed, or rely on a user refresh
            toast.error(strings.errors.generic);
        }
    };

    const isHoverOpen = useSidebarStore((s) => s.isHoverOpen);

    return (
        <aside
            className={styles.sidebar}
            data-pinned={String(isPinned)}
            data-open={String(isHoverOpen)}
            aria-label={strings.sidebar.ariaLabel}
        >
            <SidebarHeader
                isPinned={isPinned}
                isHoverOpen={isHoverOpen}
                onTogglePin={togglePin}
            />

            <div className={styles.workspaces}>
                <div className={styles.newWorkspaceWrapper} ref={dropdownRef}>
                    <div className={styles.splitButtonContainer}>
                        <button
                            className={styles.newWorkspaceMain}
                            onClick={handleNewWorkspace}
                            disabled={isCreating || isCreatingDivider}
                        >
                            <PlusIcon size={18} />
                            <span>{isCreating ? strings.common.loading : strings.workspace.newWorkspace}</span>
                        </button>
                        <div className={styles.splitDivider} />
                        <button
                            className={styles.newWorkspaceDropdown}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isCreating || isCreatingDivider}
                            aria-label="New Workspace Options"
                            aria-expanded={isDropdownOpen}
                        >
                            <ChevronDownIcon size={18} />
                        </button>
                    </div>
                    {isDropdownOpen && (
                        <div className={styles.dropdownMenu}>
                            <button
                                className={styles.dropdownItem}
                                onClick={handleNewDivider}
                                disabled={isCreating || isCreatingDivider}
                            >
                                {isCreatingDivider ? strings.common.loading : 'Add Divider'}
                            </button>
                        </div>
                    )}
                </div>

                <WorkspaceList
                    workspaces={workspaces}
                    currentWorkspaceId={currentWorkspaceId}
                    onSelectWorkspace={handleSelectWorkspace}
                    onRenameWorkspace={handleRenameWorkspace}
                    onReorderWorkspace={handleReorderWorkspace}
                    onDeleteWorkspace={handleDeleteDivider}
                />
            </div>

            <SidebarFooter onSettingsClick={onSettingsClick} />
        </aside>
    );
}
