/**
 * SyncStatusIndicator - Shows sync/save status with colored dot
 * Reads from saveStatusStore + networkStatusStore + backgroundSyncStatus.
 * All text from strings.offline.* / strings.backgroundSync.* — no hardcoded strings.
 */
import { useSaveStatusStore } from '@/shared/stores/saveStatusStore';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { useOfflineQueueStore } from '@/features/workspace/stores/offlineQueueStore';
import { useBackgroundSyncStatus } from '@/shared/hooks/useBackgroundSyncStatus';
import { strings } from '@/shared/localization/strings';
import styles from './SyncStatusIndicator.module.css';

type DotVariant = 'green' | 'spinner' | 'yellow' | 'gray' | 'red' | 'blue';

function getIndicatorState(
    status: string,
    isOnline: boolean,
    pendingCount: number,
    hasPendingBgSync: boolean
): { variant: DotVariant; label: string } {
    if (!isOnline) {
        return { variant: 'gray', label: strings.offline.offline };
    }

    // Background sync in progress takes priority when online
    if (hasPendingBgSync) {
        return { variant: 'blue', label: strings.backgroundSync.syncing };
    }

    switch (status) {
        case 'saving':
            return { variant: 'spinner', label: strings.offline.saving };
        case 'saved':
            return { variant: 'green', label: strings.offline.saved };
        case 'queued':
            return {
                variant: 'yellow',
                label: `${pendingCount} ${strings.offline.queuedCount}`,
            };
        case 'error':
            return { variant: 'red', label: strings.offline.saveError };
        default:
            return { variant: 'green', label: strings.offline.saved };
    }
}

export function SyncStatusIndicator() {
    const status = useSaveStatusStore((s) => s.status);
    const isOnline = useNetworkStatusStore((s) => s.isOnline);
    const pendingCount = useOfflineQueueStore((s) => s.pendingCount);
    const { hasPendingSync } = useBackgroundSyncStatus();

    const { variant, label } = getIndicatorState(
        status, isOnline, pendingCount, hasPendingSync
    );

    return (
        <div className={styles.indicator}>
            <span className={`${styles.dot} ${styles[variant]}`} />
            <span className={styles.label}>{label}</span>
        </div>
    );
}
