/**
 * useBackgroundSyncStatus - Reactive hook for Background Sync state
 * SOLID SRP: Only tracks whether BG Sync is supported and pending
 */
import { useState, useEffect } from 'react';
import { backgroundSyncService } from '@/features/workspace/services/backgroundSyncService';

interface BackgroundSyncStatus {
    isSupported: boolean;
    hasPendingSync: boolean;
}

export function useBackgroundSyncStatus(): BackgroundSyncStatus {
    const [isSupported] = useState(() => backgroundSyncService.isBackgroundSyncSupported());
    const [hasPendingSync, setHasPendingSync] = useState(false);

    useEffect(() => {
        if (!isSupported) return;

        let mounted = true;

        async function checkSync() {
            const pending = await backgroundSyncService.hasPendingSync();
            if (mounted) {
                setHasPendingSync(pending);
            }
        }

        void checkSync();
        // Poll every 5 seconds while supported
        const interval = setInterval(() => void checkSync(), 5000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [isSupported]);

    return { isSupported, hasPendingSync };
}
