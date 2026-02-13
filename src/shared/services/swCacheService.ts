/**
 * Service Worker Cache Service - Thin abstraction over Cache API
 * SOLID SRP: Only handles manual cache read/write/delete operations
 * Gracefully handles environments where Cache API is unavailable.
 */

const DEFAULT_CACHE_NAME = 'actionstation-runtime';

function isCacheAvailable(): boolean {
    return typeof caches !== 'undefined';
}

async function getFromCache(
    url: string,
    cacheName: string = DEFAULT_CACHE_NAME
): Promise<Response | null> {
    if (!isCacheAvailable()) return null;

    try {
        const cache = await caches.open(cacheName);
        const response = await cache.match(url);
        return response ?? null;
    } catch {
        return null;
    }
}

async function putInCache(
    url: string,
    response: Response,
    cacheName: string = DEFAULT_CACHE_NAME
): Promise<boolean> {
    if (!isCacheAvailable()) return false;

    try {
        const cache = await caches.open(cacheName);
        await cache.put(url, response.clone());
        return true;
    } catch {
        return false;
    }
}

async function deleteFromCache(
    url: string,
    cacheName: string = DEFAULT_CACHE_NAME
): Promise<boolean> {
    if (!isCacheAvailable()) return false;

    try {
        const cache = await caches.open(cacheName);
        return await cache.delete(url);
    } catch {
        return false;
    }
}

async function clearCache(cacheName: string = DEFAULT_CACHE_NAME): Promise<boolean> {
    if (!isCacheAvailable()) return false;

    try {
        return await caches.delete(cacheName);
    } catch {
        return false;
    }
}

export const swCacheService = {
    isCacheAvailable,
    getFromCache,
    putInCache,
    deleteFromCache,
    clearCache,
};
