/**
 * useQueueDrainer Background Sync Tests
 * TDD: Verifies drainer skips manual drain when BG Sync is active
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQueueDrainer } from '@/app/hooks/useQueueDrainer';

// Mock network status
let mockIsOnline = true;
vi.mock('@/shared/stores/networkStatusStore', () => ({
    useNetworkStatusStore: (selector: (s: { isOnline: boolean }) => unknown) =>
        selector({ isOnline: mockIsOnline }),
}));

// Mock offline queue store
const mockDrainQueue = vi.fn().mockResolvedValue(undefined);
let mockPendingCount = 0;
let mockBgSyncRegistered = false;
vi.mock('@/features/workspace/stores/offlineQueueStore', () => ({
    useOfflineQueueStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({
            drainQueue: mockDrainQueue,
            pendingCount: mockPendingCount,
            bgSyncRegistered: mockBgSyncRegistered,
        }),
}));

// Mock toast
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn() },
}));

// Mock backgroundSyncService
let mockBgSyncSupported = false;
vi.mock('@/features/workspace/services/backgroundSyncService', () => ({
    backgroundSyncService: {
        isBackgroundSyncSupported: () => mockBgSyncSupported,
        registerSync: vi.fn().mockResolvedValue(false),
        hasPendingSync: vi.fn().mockResolvedValue(false),
        SYNC_TAG: 'offline-queue-sync',
    },
}));

describe('useQueueDrainer - bgSync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsOnline = true;
        mockPendingCount = 0;
        mockBgSyncRegistered = false;
        mockBgSyncSupported = false;
    });

    it('skips manual drain when BG Sync is registered and supported', () => {
        mockBgSyncRegistered = true;
        mockBgSyncSupported = true;
        mockPendingCount = 3;

        // Start offline
        mockIsOnline = false;
        const { rerender } = renderHook(() => useQueueDrainer());

        // Go online
        mockIsOnline = true;
        rerender();

        // Should NOT call drainQueue because BG Sync handles it
        expect(mockDrainQueue).not.toHaveBeenCalled();
    });

    it('falls back to manual drain when BG Sync is not supported', () => {
        mockBgSyncRegistered = false;
        mockBgSyncSupported = false;
        mockPendingCount = 3;

        // Start offline
        mockIsOnline = false;
        const { rerender } = renderHook(() => useQueueDrainer());

        // Go online
        mockIsOnline = true;
        rerender();

        expect(mockDrainQueue).toHaveBeenCalled();
    });

    it('falls back to manual drain when BG Sync not registered', () => {
        mockBgSyncRegistered = false;
        mockBgSyncSupported = true;
        mockPendingCount = 2;

        // Start offline
        mockIsOnline = false;
        const { rerender } = renderHook(() => useQueueDrainer());

        // Go online
        mockIsOnline = true;
        rerender();

        expect(mockDrainQueue).toHaveBeenCalled();
    });
});
