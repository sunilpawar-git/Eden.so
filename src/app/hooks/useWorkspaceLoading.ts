/**
 * useWorkspaceLoading Hook - Handles initial loading and hydration of workspaces
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { indexedDbService, IDB_STORES } from '@/shared/services/indexedDbService';
import { loadUserWorkspaces } from '@/features/workspace/services/workspaceService';

export function useWorkspaceLoading() {
    const { user } = useAuthStore();
    const {
        setCurrentWorkspaceId,
        setWorkspaces,
    } = useWorkspaceStore();

    useEffect(() => {
        if (!user) return;
        const userId = user.id;

        async function load() {
            await workspaceCache.hydrateFromIdb();
            try {
                const loaded = await loadUserWorkspaces(userId);
                setWorkspaces(loaded);

                const metadata = loaded.map(ws => ({ id: ws.id, name: ws.name, updatedAt: Date.now() }));
                void indexedDbService.put(IDB_STORES.metadata, '__workspace_metadata__', metadata);

                const currentId = useWorkspaceStore.getState().currentWorkspaceId;
                const firstReal = loaded.find(ws => ws.type !== 'divider');
                if (firstReal && !loaded.some(ws => ws.id === currentId)) {
                    setCurrentWorkspaceId(firstReal.id);
                }

                if (loaded.length > 0) {
                    void workspaceCache.preload(userId, loaded.map(ws => ws.id)).catch((err: unknown) => {
                        console.warn('[Sidebar] Cache preload failed:', err);
                    });
                }
            } catch (error) {
                console.error('[Sidebar] Failed to load workspaces:', error);
                const cached = await indexedDbService.get<Array<{ id: string; name: string; updatedAt: number }>>(IDB_STORES.metadata, '__workspace_metadata__');
                if (cached?.length) {
                    setWorkspaces(cached.map(m => ({
                        id: m.id, userId, name: m.name, canvasSettings: { backgroundColor: 'white' as const },
                        createdAt: new Date(m.updatedAt), updatedAt: new Date(m.updatedAt)
                    })));
                }
            }
        }
        void load();
    }, [user, setWorkspaces, setCurrentWorkspaceId]);
}
