/**
 * Link Preview Cache - In-memory + localStorage cache with TTL expiration
 * Prevents redundant network requests for previously-fetched URLs
 */
import type { LinkPreviewMetadata } from '../types/node';

/** Cache TTL: 24 hours */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** localStorage key for persisted cache */
export const STORAGE_KEY = 'eden_link_previews';

/** In-memory cache map (URL → metadata) */
let memoryCache = new Map<string, LinkPreviewMetadata>();

/**
 * Check if a preview is stale (older than TTL)
 */
export function isStale(metadata: LinkPreviewMetadata, ttl = CACHE_TTL_MS): boolean {
    return Date.now() - metadata.fetchedAt > ttl;
}

/**
 * Get a preview from cache. Returns null on miss or stale entry.
 * Checks memory first, then falls back to localStorage.
 */
export function getFromCache(url: string): LinkPreviewMetadata | null {
    // Check memory cache first
    const memEntry = memoryCache.get(url);
    if (memEntry) return isStale(memEntry) || memEntry.error ? null : memEntry;

    // Fall back to localStorage
    const stored = loadFromStorage();
    const entry = stored[url];
    if (!entry) return null;
    if (isStale(entry) || entry.error) return null;

    // Promote to memory cache for faster subsequent reads
    memoryCache.set(url, entry);
    return entry;
}

/** Debounce timer for localStorage writes */
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounce delay for batching localStorage writes (ms) */
const PERSIST_DEBOUNCE_MS = 1000;

/**
 * Store a preview in memory and schedule debounced localStorage write.
 * Batches rapid writes to avoid jank and quota pressure.
 */
export function setInCache(url: string, metadata: LinkPreviewMetadata): void {
    memoryCache.set(url, metadata);
    schedulePersist();
}

/** Schedule a debounced persist to localStorage */
function schedulePersist(): void {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
        persistTimer = null;
        persistToStorage();
    }, PERSIST_DEBOUNCE_MS);
}

/** Clear all cached entries (memory + localStorage) */
export function clearCache(): void {
    memoryCache = new Map();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/** Get the number of entries in memory cache */
export function getCacheSize(): number {
    return memoryCache.size;
}

/** Load cache from localStorage, handling corruption gracefully */
function loadFromStorage(): Record<string, LinkPreviewMetadata> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as Record<string, LinkPreviewMetadata>;
    } catch {
        return {};
    }
}

/** Persist memory cache to localStorage */
function persistToStorage(): void {
    try {
        const obj: Record<string, LinkPreviewMetadata> = {};
        for (const [url, meta] of memoryCache) { obj[url] = meta; }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch { /* quota exceeded or unavailable — silent fail */ }
}
