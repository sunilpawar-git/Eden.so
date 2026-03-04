/**
 * Extraction Cache Service — manages cached extraction results on AttachmentMeta.
 * Pure functions, no side effects. Caller is responsible for persisting updates.
 */
import type { AttachmentMeta } from '@/features/canvas/types/document';
import type { ExtractionResult } from '../types/documentAgent';

/** Cache time-to-live: 24 hours in milliseconds */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Get a cached extraction from attachment meta if it exists and is fresh.
 * Returns null if no cache, stale (> 24h), or incomplete data.
 */
export function getCachedExtraction(meta: AttachmentMeta): ExtractionResult | null {
    if (!meta.extraction || meta.analyzedAt == null) return null;

    const age = Date.now() - meta.analyzedAt;
    if (age > CACHE_TTL_MS) return null;

    return meta.extraction;
}

/**
 * Return a new AttachmentMeta with extraction result cached.
 * Does not mutate the original — returns a new object.
 */
export function cacheExtraction(meta: AttachmentMeta, result: ExtractionResult): AttachmentMeta {
    return {
        ...meta,
        extraction: result,
        analyzedAt: Date.now(),
    };
}
