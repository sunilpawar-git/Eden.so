/**
 * Background Sync Service Tests
 * TDD: Verifies Background Sync registration and detection
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { backgroundSyncService } from '../backgroundSyncService';

describe('backgroundSyncService', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
        Object.defineProperty(globalThis, 'navigator', {
            value: originalNavigator,
            configurable: true,
            writable: true,
        });
        // Clean up SyncManager
        if ('SyncManager' in globalThis) {
            delete (globalThis as Record<string, unknown>).SyncManager;
        }
    });

    describe('isBackgroundSyncSupported', () => {
        it('returns false when SyncManager is not available', () => {
            expect(backgroundSyncService.isBackgroundSyncSupported()).toBe(false);
        });

        it('returns true when SyncManager and serviceWorker are available', () => {
            // Mock SyncManager as a constructor function
            Object.defineProperty(globalThis, 'SyncManager', {
                value: function SyncManager() {
                    return this;
                },
                configurable: true,
                writable: true,
            });
            Object.defineProperty(globalThis, 'navigator', {
                value: { serviceWorker: { ready: Promise.resolve({}) } },
                configurable: true,
                writable: true,
            });
            expect(backgroundSyncService.isBackgroundSyncSupported()).toBe(true);
        });
    });

    describe('registerSync', () => {
        it('returns false when Background Sync is not supported', async () => {
            const result = await backgroundSyncService.registerSync();
            expect(result).toBe(false);
        });

        it('returns true when sync registration succeeds', async () => {
            const mockRegister = vi.fn().mockResolvedValue(undefined);
            // Mock SyncManager as a constructor function
            Object.defineProperty(globalThis, 'SyncManager', {
                value: function SyncManager() {
                    return this;
                },
                configurable: true,
                writable: true,
            });
            Object.defineProperty(globalThis, 'navigator', {
                value: {
                    serviceWorker: {
                        ready: Promise.resolve({
                            sync: { register: mockRegister },
                        }),
                    },
                },
                configurable: true,
                writable: true,
            });

            const result = await backgroundSyncService.registerSync();
            expect(result).toBe(true);
            expect(mockRegister).toHaveBeenCalledWith('offline-queue-sync');
        });
    });

    describe('hasPendingSync', () => {
        it('returns false when not supported', async () => {
            const result = await backgroundSyncService.hasPendingSync();
            expect(result).toBe(false);
        });

        it('returns true when sync tag is registered', async () => {
            const mockGetTags = vi.fn().mockResolvedValue(['offline-queue-sync']);
            // Mock SyncManager as a constructor function
            Object.defineProperty(globalThis, 'SyncManager', {
                value: function SyncManager() {
                    return this;
                },
                configurable: true,
                writable: true,
            });
            Object.defineProperty(globalThis, 'navigator', {
                value: {
                    serviceWorker: {
                        ready: Promise.resolve({
                            sync: { getTags: mockGetTags },
                        }),
                    },
                },
                configurable: true,
                writable: true,
            });

            const result = await backgroundSyncService.hasPendingSync();
            expect(result).toBe(true);
        });
    });

    describe('SYNC_TAG', () => {
        it('exposes the sync tag constant', () => {
            expect(backgroundSyncService.SYNC_TAG).toBe('offline-queue-sync');
        });
    });
});
