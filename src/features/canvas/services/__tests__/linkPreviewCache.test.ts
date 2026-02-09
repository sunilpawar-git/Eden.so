/**
 * Link Preview Cache Tests
 * TDD: Validates in-memory + localStorage cache with TTL expiration
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getFromCache, setInCache, isStale, clearCache, getCacheSize,
    CACHE_TTL_MS, STORAGE_KEY,
} from '../linkPreviewCache';
import type { LinkPreviewMetadata } from '../../types/node';

const mockPreview = (url: string, fetchedAt = Date.now()): LinkPreviewMetadata => ({
    url,
    title: `Title for ${url}`,
    description: 'A description',
    domain: 'example.com',
    fetchedAt,
});

describe('linkPreviewCache', () => {
    beforeEach(() => {
        clearCache();
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('setInCache / getFromCache', () => {
        it('stores and retrieves a preview by URL', () => {
            const preview = mockPreview('https://a.com');
            setInCache('https://a.com', preview);
            expect(getFromCache('https://a.com')).toEqual(preview);
        });

        it('returns null for cache miss', () => {
            expect(getFromCache('https://missing.com')).toBeNull();
        });

        it('overwrites existing entry for same URL', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            const updated = { ...mockPreview('https://a.com'), title: 'Updated' };
            setInCache('https://a.com', updated);
            expect(getFromCache('https://a.com')?.title).toBe('Updated');
        });

        it('stores multiple entries', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            setInCache('https://b.com', mockPreview('https://b.com'));
            expect(getFromCache('https://a.com')).not.toBeNull();
            expect(getFromCache('https://b.com')).not.toBeNull();
        });
    });

    describe('isStale', () => {
        it('returns false for fresh metadata', () => {
            const fresh = mockPreview('https://a.com', Date.now());
            expect(isStale(fresh)).toBe(false);
        });

        it('returns true for metadata older than TTL', () => {
            const old = mockPreview('https://a.com', Date.now() - CACHE_TTL_MS - 1);
            expect(isStale(old)).toBe(true);
        });

        it('accepts custom TTL', () => {
            const customTtl = 1000; // 1 second
            const recent = mockPreview('https://a.com', Date.now() - 500);
            const old = mockPreview('https://a.com', Date.now() - 1500);
            expect(isStale(recent, customTtl)).toBe(false);
            expect(isStale(old, customTtl)).toBe(true);
        });
    });

    describe('getFromCache with staleness', () => {
        it('returns null for stale entries', () => {
            const stale = mockPreview('https://a.com', Date.now() - CACHE_TTL_MS - 1);
            setInCache('https://a.com', stale);
            expect(getFromCache('https://a.com')).toBeNull();
        });

        it('returns entry when within TTL', () => {
            const fresh = mockPreview('https://a.com', Date.now());
            setInCache('https://a.com', fresh);
            expect(getFromCache('https://a.com')).toEqual(fresh);
        });
    });

    describe('clearCache', () => {
        it('removes all entries from memory cache', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            setInCache('https://b.com', mockPreview('https://b.com'));
            clearCache();
            expect(getFromCache('https://a.com')).toBeNull();
            expect(getFromCache('https://b.com')).toBeNull();
        });
    });

    describe('getCacheSize', () => {
        it('returns 0 for empty cache', () => {
            expect(getCacheSize()).toBe(0);
        });

        it('returns count of cached entries', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            setInCache('https://b.com', mockPreview('https://b.com'));
            expect(getCacheSize()).toBe(2);
        });
    });

    describe('localStorage persistence', () => {
        it('persists cache to localStorage on setInCache', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            const stored = localStorage.getItem(STORAGE_KEY);
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!) as Record<string, LinkPreviewMetadata>;
            expect(parsed['https://a.com']).toBeDefined();
        });

        it('loads from localStorage on getFromCache when memory is empty', () => {
            const preview = mockPreview('https://a.com');
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'https://a.com': preview }));
            // Memory cache is empty (clearCache was called in beforeEach)
            expect(getFromCache('https://a.com')).toEqual(preview);
        });

        it('handles corrupted localStorage gracefully', () => {
            localStorage.setItem(STORAGE_KEY, 'not-valid-json');
            expect(getFromCache('https://a.com')).toBeNull();
        });
    });
});
