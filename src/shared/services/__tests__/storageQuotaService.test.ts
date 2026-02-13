/**
 * Storage Quota Service Tests
 * TDD: Verifies quota reporting and StorageManager absence handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storageQuotaService } from '../storageQuotaService';

describe('storageQuotaService', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
        Object.defineProperty(globalThis, 'navigator', {
            value: originalNavigator,
            configurable: true,
            writable: true,
        });
    });

    describe('isStorageManagerAvailable', () => {
        it('returns true when StorageManager is available', () => {
            Object.defineProperty(globalThis, 'navigator', {
                value: {
                    storage: { estimate: vi.fn() },
                },
                configurable: true,
                writable: true,
            });
            expect(storageQuotaService.isStorageManagerAvailable()).toBe(true);
        });

        it('returns false when navigator.storage is absent', () => {
            Object.defineProperty(globalThis, 'navigator', {
                value: {},
                configurable: true,
                writable: true,
            });
            expect(storageQuotaService.isStorageManagerAvailable()).toBe(false);
        });
    });

    describe('getQuotaInfo', () => {
        beforeEach(() => {
            Object.defineProperty(globalThis, 'navigator', {
                value: {
                    storage: {
                        estimate: vi.fn().mockResolvedValue({
                            usage: 1024 * 1024, // 1MB
                            quota: 1024 * 1024 * 1024, // 1GB
                        }),
                    },
                },
                configurable: true,
                writable: true,
            });
        });

        it('returns quota info with percentage', async () => {
            const info = await storageQuotaService.getQuotaInfo();
            expect(info.isAvailable).toBe(true);
            expect(info.usageBytes).toBe(1024 * 1024);
            expect(info.quotaBytes).toBe(1024 * 1024 * 1024);
            expect(info.percentUsed).toBeCloseTo(0.1, 1);
        });

        it('returns unavailable info when StorageManager is absent', async () => {
            Object.defineProperty(globalThis, 'navigator', {
                value: {},
                configurable: true,
                writable: true,
            });

            const info = await storageQuotaService.getQuotaInfo();
            expect(info.isAvailable).toBe(false);
            expect(info.usageBytes).toBe(0);
        });
    });

    describe('formatBytes', () => {
        it('formats 0 bytes', () => {
            expect(storageQuotaService.formatBytes(0)).toBe('0 B');
        });

        it('formats bytes to KB', () => {
            expect(storageQuotaService.formatBytes(1536)).toBe('1.5 KB');
        });

        it('formats bytes to MB', () => {
            expect(storageQuotaService.formatBytes(1048576)).toBe('1.0 MB');
        });

        it('formats bytes to GB', () => {
            expect(storageQuotaService.formatBytes(1073741824)).toBe('1.0 GB');
        });
    });
});
