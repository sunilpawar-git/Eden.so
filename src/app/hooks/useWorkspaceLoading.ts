/**
 * useWorkspaceLoading Hook - Handles initial loading and hydration of workspaces
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { workspaceCache } from '@/features/workspace/services/workspaceCache';
import { indexedDbService, IDB_STORES } from '@/shared/services/indexedDbService';
import { loadUserWorkspaces } from '@/features/workspace/services/workspaceService';
import { getLastWorkspaceId } from '@/features/workspace/services/lastWorkspaceService';
import type { CanvasBackground } from '@/features/workspace/types/workspace';
import { logger } from '@/shared/services/logger';

export function useWorkspaceLoading() {
    const userId = useAuthStore((s) => s.user?.id);

    useEffect(() => {
        if (!userId) return;
        const uid: string = userId;

        async function load() {
            try {
                await workspaceCache.hydrateFromIdb();
                const loaded = await loadUserWorkspaces(uid);
                useWorkspaceStore.getState().setWorkspaces(loaded);

                const metadata = loaded.map(ws => ({
                    id: ws.id,
                    name: ws.name,
                    type: ws.type,
                    orderIndex: ws.orderIndex,
                    backgroundColor: ws.canvasSettings.backgroundColor,
                    updatedAt: Date.now(),
                }));
                indexedDbService
                    .put(IDB_STORES.metadata, '__workspace_metadata__', metadata)
                    .catch((err: unknown) => logger.warn('[useWorkspaceLoading] IDB write failed:', err));

                const currentId = useWorkspaceStore.getState().currentWorkspaceId;
                const firstReal = loaded.find(ws => ws.type !== 'divider');

                if (!loaded.some(ws => ws.id === currentId)) {
                    const lastId = getLastWorkspaceId();
                    if (lastId && loaded.some(ws => ws.id === lastId)) {
                        useWorkspaceStore.getState().setCurrentWorkspaceId(lastId);
                    } else if (firstReal) {
                        useWorkspaceStore.getState().setCurrentWorkspaceId(firstReal.id);
                    }
                }

                if (loaded.length > 0) {
                    workspaceCache.preload(uid, loaded.map(ws => ws.id)).catch((err: unknown) => {
                        logger.warn('[useWorkspaceLoading] Cache preload failed:', err);
                    });
                }
            } catch (error) {
                logger.error('[useWorkspaceLoading] Failed to load workspaces:', error);
                const cached = await indexedDbService.get<Array<{
                    id: string;
                    name: string;
                    type?: string;
                    orderIndex?: number;
                    backgroundColor?: CanvasBackground;
                    updatedAt: number;
                }>>(IDB_STORES.metadata, '__workspace_metadata__');
                if (cached?.length) {
                    useWorkspaceStore.getState().setWorkspaces(cached.map(m => ({
                        id: m.id,
                        userId: uid,
                        name: m.name,
                        type: (m.type ?? 'workspace') as 'workspace' | 'divider',
                        orderIndex: m.orderIndex ?? 0,
                        canvasSettings: { backgroundColor: m.backgroundColor ?? 'grid' as CanvasBackground },
                        createdAt: new Date(m.updatedAt),
                        updatedAt: new Date(m.updatedAt),
                    })));
                }
            }
        }
        void load();
    }, [userId]);
}
