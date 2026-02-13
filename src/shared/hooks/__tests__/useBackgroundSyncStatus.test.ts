/**
 * useBackgroundSyncStatus Hook Tests
 * TDD: Verifies sync status detection
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBackgroundSyncStatus } from '../useBackgroundSyncStatus';

// Mock backgroundSyncService
let mockSupported = false;
let mockPending = false;

vi.mock('@/features/workspace/services/backgroundSyncService', () => ({
    backgroundSyncService: {
        isBackgroundSyncSupported: () => mockSupported,
        hasPendingSync: () => Promise.resolve(mockPending),
        registerSync: vi.fn().mockResolvedValue(false),
        SYNC_TAG: 'offline-queue-sync',
    },
}));

describe('useBackgroundSyncStatus', () => {
    it('returns isSupported=false when BG Sync is not available', () => {
        mockSupported = false;
        const { result } = renderHook(() => useBackgroundSyncStatus());
        expect(result.current.isSupported).toBe(false);
    });

    it('returns isSupported=true when BG Sync is available', () => {
        mockSupported = true;
        const { result } = renderHook(() => useBackgroundSyncStatus());
        expect(result.current.isSupported).toBe(true);
    });

    it('defaults hasPendingSync to false', () => {
        mockSupported = false;
        mockPending = false;
        const { result } = renderHook(() => useBackgroundSyncStatus());
        expect(result.current.hasPendingSync).toBe(false);
    });
});
