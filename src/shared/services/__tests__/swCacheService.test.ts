/**
 * swCacheService Tests
 * TDD: Verifies Cache API abstraction handles operations and missing API
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { swCacheService } from '../swCacheService';

// Mock the global caches API
const mockMatch = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockOpen = vi.fn().mockResolvedValue({
    match: mockMatch,
    put: mockPut,
    delete: mockDelete,
});
const mockCachesDelete = vi.fn();

describe('swCacheService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup global caches mock
        Object.defineProperty(globalThis, 'caches', {
            value: {
                open: mockOpen,
                delete: mockCachesDelete,
            },
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        // Restore
        Object.defineProperty(globalThis, 'caches', {
            value: undefined,
            configurable: true,
            writable: true,
        });
    });

    describe('isCacheAvailable', () => {
        it('returns true when caches API is available', () => {
            expect(swCacheService.isCacheAvailable()).toBe(true);
        });

        it('returns false when caches API is undefined', () => {
            Object.defineProperty(globalThis, 'caches', {
                value: undefined,
                configurable: true,
                writable: true,
            });
            expect(swCacheService.isCacheAvailable()).toBe(false);
        });
    });

    describe('getFromCache', () => {
        it('returns response when cache hit', async () => {
            const mockResponse = new Response('cached');
            mockMatch.mockResolvedValue(mockResponse);

            const result = await swCacheService.getFromCache('https://example.com/api');
            expect(result).toBe(mockResponse);
            expect(mockOpen).toHaveBeenCalledWith('actionstation-runtime');
        });

        it('returns null on cache miss', async () => {
            mockMatch.mockResolvedValue(undefined);

            const result = await swCacheService.getFromCache('https://example.com/miss');
            expect(result).toBeNull();
        });

        it('returns null when Cache API is unavailable', async () => {
            Object.defineProperty(globalThis, 'caches', {
                value: undefined,
                configurable: true,
                writable: true,
            });
            const result = await swCacheService.getFromCache('https://example.com/api');
            expect(result).toBeNull();
        });

        it('returns null on error', async () => {
            mockOpen.mockRejectedValueOnce(new Error('Cache error'));
            const result = await swCacheService.getFromCache('https://example.com/api');
            expect(result).toBeNull();
        });
    });

    describe('putInCache', () => {
        it('stores response in cache', async () => {
            mockPut.mockResolvedValue(undefined);
            const response = new Response('data');

            const result = await swCacheService.putInCache('https://example.com/api', response);
            expect(result).toBe(true);
            expect(mockPut).toHaveBeenCalled();
        });

        it('returns false when Cache API is unavailable', async () => {
            Object.defineProperty(globalThis, 'caches', {
                value: undefined,
                configurable: true,
                writable: true,
            });
            const response = new Response('data');
            const result = await swCacheService.putInCache('https://example.com/api', response);
            expect(result).toBe(false);
        });
    });

    describe('deleteFromCache', () => {
        it('deletes entry from cache', async () => {
            mockDelete.mockResolvedValue(true);
            const result = await swCacheService.deleteFromCache('https://example.com/api');
            expect(result).toBe(true);
        });

        it('returns false when Cache API is unavailable', async () => {
            Object.defineProperty(globalThis, 'caches', {
                value: undefined,
                configurable: true,
                writable: true,
            });
            const result = await swCacheService.deleteFromCache('https://example.com/api');
            expect(result).toBe(false);
        });
    });

    describe('clearCache', () => {
        it('deletes entire cache by name', async () => {
            mockCachesDelete.mockResolvedValue(true);
            const result = await swCacheService.clearCache();
            expect(result).toBe(true);
            expect(mockCachesDelete).toHaveBeenCalledWith('actionstation-runtime');
        });

        it('returns false when Cache API is unavailable', async () => {
            Object.defineProperty(globalThis, 'caches', {
                value: undefined,
                configurable: true,
                writable: true,
            });
            const result = await swCacheService.clearCache();
            expect(result).toBe(false);
        });
    });
});
