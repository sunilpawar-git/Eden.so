/**
 * OfflineBanner - Dismissible banner shown when user is offline
 * Shows offline message + pending queue count.
 * All text from strings.offline.* — no hardcoded strings.
 */
import { useState, useEffect } from 'react';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { useOfflineQueueStore } from '@/features/workspace/stores/offlineQueueStore';
import { strings } from '@/shared/localization/strings';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
    const isOnline = useNetworkStatusStore((s) => s.isOnline);
    const pendingCount = useOfflineQueueStore((s) => s.pendingCount);
    const [isDismissed, setIsDismissed] = useState(false);

    // Reset dismissed state when going back online (so it reappears on next offline)
    useEffect(() => {
        if (isOnline) {
            setIsDismissed(false);
        }
    }, [isOnline]);

    // Don't render when online or dismissed
    if (isOnline || isDismissed) {
        return null;
    }

    return (
        <div className={styles.banner}>
            <span className={styles.message}>
                {strings.offline.offlineBanner}
                {pendingCount > 0 && (
                    <span className={styles.count}>
                        {' · '}{pendingCount} {strings.offline.pendingSync}
                    </span>
                )}
            </span>
            <button
                className={styles.dismiss}
                onClick={() => setIsDismissed(true)}
            >
                {strings.offline.dismiss}
            </button>
        </div>
    );
}
