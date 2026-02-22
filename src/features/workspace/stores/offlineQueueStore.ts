/**
 * Offline Queue Store - Reactive state for offline save queue
 * SOLID SRP: Bridges offlineQueueService with UI reactivity
 * Attempts Background Sync when available, falls back to manual drain.
 */
import { create } from 'zustand';
import { offlineQueueService } from '../services/offlineQueueService';
import { backgroundSyncService } from '../services/backgroundSyncService';
import { serializeNodes, deserializeNodes } from '../services/nodeSerializer';
import { saveNodes, saveEdges, updateWorkspaceNodeCount } from '../services/workspaceService';
import { useSaveStatusStore } from '@/shared/stores/saveStatusStore';
import { useSubscriptionStore } from '@/features/subscription/stores/subscriptionStore';
import { GATED_FEATURES } from '@/features/subscription/types/subscription';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

interface OfflineQueueState {
    pendingCount: number;
    isDraining: boolean;
    bgSyncRegistered: boolean;
}

interface OfflineQueueActions {
    queueSave: (userId: string, workspaceId: string, nodes: CanvasNode[], edges: CanvasEdge[]) => void;
    drainQueue: () => Promise<void>;
    refreshCount: () => void;
}

type OfflineQueueStore = OfflineQueueState & OfflineQueueActions;

export const useOfflineQueueStore = create<OfflineQueueStore>()((set, get) => ({
    pendingCount: offlineQueueService.size(),
    isDraining: false,
    bgSyncRegistered: false,

    queueSave: (userId, workspaceId, nodes, edges) => {
        const op = {
            id: `save-${workspaceId}-${Date.now()}`,
            userId,
            workspaceId,
            nodes: serializeNodes(nodes),
            edges,
            queuedAt: Date.now(),
            retryCount: 0,
        };
        offlineQueueService.enqueue(op);
        set({ pendingCount: offlineQueueService.size() });

        // Attempt Background Sync registration (non-blocking, gated to Pro)
        const hasBgSync = useSubscriptionStore.getState().hasAccess(GATED_FEATURES.backgroundSync);
        if (hasBgSync) {
            void backgroundSyncService.registerSync().then((registered) => {
                if (registered) {
                    set({ bgSyncRegistered: true });
                }
            });
        }
    },

    drainQueue: async () => {
        const oldest = offlineQueueService.getOldestOperation();
        if (!oldest) {
            set({ bgSyncRegistered: false });
            return;
        }

        set({ isDraining: true });

        try {
            const { setSaving, setSaved } = useSaveStatusStore.getState();
            setSaving();

            const nodes = deserializeNodes(oldest.nodes);
            await Promise.all([
                saveNodes(oldest.userId, oldest.workspaceId, nodes),
                saveEdges(oldest.userId, oldest.workspaceId, oldest.edges),
                updateWorkspaceNodeCount(oldest.userId, oldest.workspaceId, nodes.length),
            ]);

            offlineQueueService.dequeue(oldest.id);
            set({ pendingCount: offlineQueueService.size() });
            setSaved();

            // Recurse to drain remaining operations
            const remaining = offlineQueueService.getOldestOperation();
            if (remaining) {
                await get().drainQueue();
            }
        } catch (error) {
            const { setError } = useSaveStatusStore.getState();
            const message = error instanceof Error ? error.message : strings.offline.syncFailed;
            setError(message);
            toast.error(strings.offline.syncFailed);
        } finally {
            set({ isDraining: false, bgSyncRegistered: false });
        }
    },

    refreshCount: () => {
        set({ pendingCount: offlineQueueService.size() });
    },
}));
