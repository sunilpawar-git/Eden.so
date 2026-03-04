/**
 * Extraction Cache Service Tests — caching extraction results on AttachmentMeta
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AttachmentMeta } from '@/features/canvas/types/document';
import { createMockExtraction } from './fixtures/extractionFixtures';

const HOUR_MS = 60 * 60 * 1000;

/* eslint-disable import-x/first -- Must import after vi.mock */
import { getCachedExtraction, cacheExtraction, CACHE_TTL_MS } from '../services/extractionCacheService';
/* eslint-enable import-x/first */

const mockExtraction = createMockExtraction({
    summary: 'Monthly invoice',
    keyFacts: ['Total: $500'],
    actionItems: [],
    questions: [],
});

describe('extractionCacheService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('getCachedExtraction', () => {
        it('returns null when no extraction cached', () => {
            const meta: AttachmentMeta = {
                filename: 'test.pdf',
                url: 'https://example.com/test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
            };

            expect(getCachedExtraction(meta)).toBeNull();
        });

        it('returns extraction when cache is fresh (< 24h)', () => {
            const meta: AttachmentMeta = {
                filename: 'test.pdf',
                url: 'https://example.com/test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                extraction: mockExtraction,
                analyzedAt: Date.now() - (HOUR_MS * 2),
            };

            expect(getCachedExtraction(meta)).toEqual(mockExtraction);
        });

        it('returns null when cache is stale (> 24h)', () => {
            const meta: AttachmentMeta = {
                filename: 'test.pdf',
                url: 'https://example.com/test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                extraction: mockExtraction,
                analyzedAt: Date.now() - (HOUR_MS * 25),
            };

            expect(getCachedExtraction(meta)).toBeNull();
        });

        it('returns null when analyzedAt is missing', () => {
            const meta: AttachmentMeta = {
                filename: 'test.pdf',
                url: 'https://example.com/test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                extraction: mockExtraction,
            };

            expect(getCachedExtraction(meta)).toBeNull();
        });

        it('returns null when extraction is missing but analyzedAt is set', () => {
            const meta: AttachmentMeta = {
                filename: 'test.pdf',
                url: 'https://example.com/test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                analyzedAt: Date.now(),
            };

            expect(getCachedExtraction(meta)).toBeNull();
        });
    });

    describe('cacheExtraction', () => {
        it('returns updated meta with extraction and analyzedAt', () => {
            const meta: AttachmentMeta = {
                filename: 'test.pdf',
                url: 'https://example.com/test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
            };

            const updated = cacheExtraction(meta, mockExtraction);

            expect(updated.extraction).toEqual(mockExtraction);
            expect(updated.analyzedAt).toBeGreaterThan(0);
            expect(updated.filename).toBe('test.pdf');
        });

        it('preserves all existing fields', () => {
            const meta: AttachmentMeta = {
                filename: 'test.pdf',
                url: 'https://example.com/test.pdf',
                thumbnailUrl: 'https://example.com/thumb.png',
                parsedTextUrl: 'https://example.com/parsed.txt',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
            };

            const updated = cacheExtraction(meta, mockExtraction);

            expect(updated.thumbnailUrl).toBe('https://example.com/thumb.png');
            expect(updated.parsedTextUrl).toBe('https://example.com/parsed.txt');
        });

        it('overwrites previous extraction', () => {
            const meta: AttachmentMeta = {
                filename: 'test.pdf',
                url: 'https://example.com/test.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                extraction: { ...mockExtraction, summary: 'Old summary' },
                analyzedAt: Date.now() - HOUR_MS,
            };

            const newResult = createMockExtraction({ ...mockExtraction, summary: 'New summary' });
            const updated = cacheExtraction(meta, newResult);

            expect(updated.extraction?.summary).toBe('New summary');
        });
    });

    describe('CACHE_TTL_MS', () => {
        it('is 24 hours', () => {
            expect(CACHE_TTL_MS).toBe(24 * HOUR_MS);
        });
    });
});
