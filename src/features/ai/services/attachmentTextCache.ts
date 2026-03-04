/**
 * AttachmentTextCache — Lightweight LRU cache for parsed attachment text.
 * Caches fetched plain-text content keyed by parsedTextUrl to avoid
 * re-fetching on every AI generation call.
 *
 * Uses Firebase SDK getBytes() instead of browser fetch() to:
 *  1. Bypass CORS (SDK uses internal transport)
 *  2. Use Firebase auth (no URL-embedded token dependency)
 *
 * Cap is intentionally small: attachment text can be large and is only
 * needed for the current generation session. Eviction is LRU order.
 */
import { getBytes, ref } from 'firebase/storage';
import { storage } from '@/config/firebase';
import { storagePathFromDownloadUrl } from '@/features/canvas/services/storagePathUtils';

const MAX_ENTRIES = 20;

export class AttachmentTextCache {
    private readonly cache = new Map<string, string>();

    /**
     * Retrieve cached text for a URL, or fetch via Firebase SDK and cache it.
     * Returns empty string on failure (fail-open: generation still works
     * without attachment context rather than blocking the user).
     */
    async getText(parsedTextUrl: string): Promise<string> {
        const cached = this.cache.get(parsedTextUrl);
        if (cached !== undefined) return cached;

        try {
            const storagePath = storagePathFromDownloadUrl(parsedTextUrl);
            if (!storagePath) return '';

            const bytes = await getBytes(ref(storage, storagePath));
            const text = new TextDecoder().decode(bytes);
            this.set(parsedTextUrl, text);
            return text;
        } catch {
            return '';
        }
    }

    /** Manually insert or update a cache entry */
    set(url: string, text: string): void {
        if (this.cache.has(url)) this.cache.delete(url);
        if (this.cache.size >= MAX_ENTRIES) {
            const oldest: string | undefined = this.cache.keys().next().value;
            if (oldest !== undefined) this.cache.delete(oldest);
        }
        this.cache.set(url, text);
    }

    /** Remove a specific entry (e.g., after file deletion) */
    invalidate(url: string): void {
        this.cache.delete(url);
    }

    /** Current number of cached entries (test helper) */
    get size(): number {
        return this.cache.size;
    }
}

/** Module-level singleton shared across nodePoolBuilder calls */
export const attachmentTextCache = new AttachmentTextCache();
