/**
 * useNetworkStatus - Initializes network status listeners
 * Bridge: connects networkStatusStore to component lifecycle
 */
import { useEffect } from 'react';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';

export function useNetworkStatus() {
    const isOnline = useNetworkStatusStore((s) => s.isOnline);
    const initialize = useNetworkStatusStore((s) => s.initialize);

    useEffect(() => {
        const cleanup = initialize();
        return cleanup;
    }, [initialize]);

    return { isOnline };
}
