/**
 * Network Status Store - Tracks online/offline connectivity
 * SSOT for network state across the application
 */
import { create } from 'zustand';

interface NetworkStatusState {
    isOnline: boolean;
    lastOnlineAt: number | null;
    lastOfflineAt: number | null;
}

interface NetworkStatusActions {
    /** Attach window event listeners. Returns cleanup function. */
    initialize: () => () => void;
}

type NetworkStatusStore = NetworkStatusState & NetworkStatusActions;

export const useNetworkStatusStore = create<NetworkStatusStore>()((set) => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastOnlineAt: null,
    lastOfflineAt: null,

    initialize: () => {
        const handleOnline = () => {
            set({ isOnline: true, lastOnlineAt: Date.now() });
        };

        const handleOffline = () => {
            set({ isOnline: false, lastOfflineAt: Date.now() });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    },
}));
