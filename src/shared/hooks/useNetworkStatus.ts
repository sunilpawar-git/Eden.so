/**
 * useNetworkStatus - Initializes network status listeners
 * Bridge: connects networkStatusStore to component lifecycle
 */
import { useEffect } from 'react';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';

export function useNetworkStatus() {
    const isOnline = useNetworkStatusStore((s) => s.isOnline);

    useEffect(() => {
        const cleanup = useNetworkStatusStore.getState().initialize();
        return cleanup;
    }, []);

    return { isOnline };
}
