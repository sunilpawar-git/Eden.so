/**
 * SyncStatusIndicator - Shows sync/save status with colored dot
 * Reads from saveStatusStore + networkStatusStore with selective selectors.
 * All text from strings.offline.* — no hardcoded strings.
 */
import { useSaveStatusStore } from '@/shared/stores/saveStatusStore';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';
import { useOfflineQueueStore } from '@/features/workspace/stores/offlineQueueStore';
import { strings } from '@/shared/localization/strings';
import styles from './SyncStatusIndicator.module.css';

type DotVariant = 'green' | 'spinner' | 'yellow' | 'gray' | 'red';

function getIndicatorState(
    status: string,
    isOnline: boolean,
    pendingCount: number
): { variant: DotVariant; label: string } {
    if (!isOnline) {
        return { variant: 'gray', label: strings.offline.offline };
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

    const { variant, label } = getIndicatorState(status, isOnline, pendingCount);

    return (
        <div className={styles.indicator}>
            <span className={`${styles.dot} ${styles[variant]}`} />
            <span className={styles.label}>{label}</span>
        </div>
    );
}
