/**
 * useQueueDrainer - Drains offline queue when network reconnects
 * Bridge: connects networkStatusStore with offlineQueueStore
 * Skips manual drain when Background Sync is registered (SW handles it).
 */
import { useEffect, useRef } from 'react';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { useOfflineQueueStore } from '@/features/workspace/stores/offlineQueueStore';
import { backgroundSyncService } from '@/features/workspace/services/backgroundSyncService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function useQueueDrainer() {
    const isOnline = useNetworkStatusStore((s) => s.isOnline);
    const drainQueue = useOfflineQueueStore((s) => s.drainQueue);
    const pendingCount = useOfflineQueueStore((s) => s.pendingCount);
    const bgSyncRegistered = useOfflineQueueStore((s) => s.bgSyncRegistered);
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        if (!isOnline) {
            wasOfflineRef.current = true;
            return;
        }

        // Only drain if we transitioned from offline → online with pending items
        if (wasOfflineRef.current && pendingCount > 0) {
            toast.info(strings.offline.reconnected);

            // Skip manual drain if Background Sync is handling it
            if (bgSyncRegistered && backgroundSyncService.isBackgroundSyncSupported()) {
                wasOfflineRef.current = false;
                return;
            }

            // Fallback: manual drain for browsers without Background Sync
            void drainQueue();
        }

        wasOfflineRef.current = false;
    }, [isOnline, drainQueue, pendingCount, bgSyncRegistered]);
}
