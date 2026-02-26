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
    const pendingCount = useOfflineQueueStore((s) => s.pendingCount);
    const bgSyncRegistered = useOfflineQueueStore((s) => s.bgSyncRegistered);
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        if (!isOnline) {
            wasOfflineRef.current = true;
            return;
        }

        if (wasOfflineRef.current && pendingCount > 0) {
            toast.info(strings.offline.reconnected);

            if (bgSyncRegistered && backgroundSyncService.isBackgroundSyncSupported()) {
                wasOfflineRef.current = false;
                return;
            }

            void useOfflineQueueStore.getState().drainQueue();
        }

        wasOfflineRef.current = false;
    }, [isOnline, pendingCount, bgSyncRegistered]);
}
