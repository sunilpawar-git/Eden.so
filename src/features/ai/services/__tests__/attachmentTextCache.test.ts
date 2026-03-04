/**
 * AttachmentTextCache Tests — LRU cache for parsed attachment text
 * Mocks Firebase Storage getBytes (not browser fetch) for CORS-safe reads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttachmentTextCache } from '../attachmentTextCache';

const mockGetBytes = vi.fn();
const mockRef = vi.fn((_storage: unknown, path: string) => ({ path }));
const mockStoragePath = vi.fn();

vi.mock('firebase/storage', () => ({
    getBytes: (a: unknown, b?: unknown) => mockGetBytes(a, b) as Promise<ArrayBuffer>,
    ref: (a: unknown, b?: unknown) => mockRef(a, b as string),
}));

vi.mock('@/config/firebase', () => ({
    storage: { app: { name: 'mock' } },
}));

vi.mock('@/features/canvas/services/storagePathUtils', () => ({
    storagePathFromDownloadUrl: (url: unknown) => mockStoragePath(url),
}));

/** Helper to encode a string as Uint8Array matching TextDecoder output */
function encode(text: string): ArrayBuffer {
    return new TextEncoder().encode(text).buffer;
}

describe('AttachmentTextCache', () => {
    let cache: AttachmentTextCache;

    beforeEach(() => {
        cache = new AttachmentTextCache();
        vi.clearAllMocks();
        mockStoragePath.mockReturnValue('users/u1/file.parsed.txt');
    });

    it('calls getBytes with correct storage ref when URL has valid path', async () => {
        mockGetBytes.mockResolvedValue(encode('Extracted content'));
        const url = 'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fu1%2Ffile.parsed.txt?alt=media';

        const result = await cache.getText(url);

        expect(mockStoragePath).toHaveBeenCalledWith(url);
        expect(mockRef).toHaveBeenCalled();
        expect(mockGetBytes).toHaveBeenCalled();
        expect(result).toBe('Extracted content');
    });

    it('returns cached text without calling getBytes again on cache hit', async () => {
        mockGetBytes.mockResolvedValue(encode('Cached content'));
        const url = 'https://storage/text.txt';

        await cache.getText(url);
        await cache.getText(url);

        expect(mockGetBytes).toHaveBeenCalledTimes(1);
    });

    it('returns empty string when getBytes throws (fail-open)', async () => {
        mockGetBytes.mockRejectedValue(new Error('Network error'));
        const result = await cache.getText('https://storage/text.txt');
        expect(result).toBe('');
    });

    it('returns empty string when storagePathFromDownloadUrl returns null', async () => {
        mockStoragePath.mockReturnValue(null);
        const result = await cache.getText('not-a-valid-url');
        expect(result).toBe('');
        expect(mockGetBytes).not.toHaveBeenCalled();
    });

    it('manual set() is returned on subsequent getText()', async () => {
        cache.set('https://example.com/custom.txt', 'Manual content');
        const result = await cache.getText('https://example.com/custom.txt');
        expect(result).toBe('Manual content');
        expect(mockGetBytes).not.toHaveBeenCalled();
    });

    it('invalidate() removes a cached entry', async () => {
        mockGetBytes.mockResolvedValue(encode('Fresh content'));
        cache.set('https://storage/text.txt', 'Old content');
        cache.invalidate('https://storage/text.txt');

        await cache.getText('https://storage/text.txt');
        expect(mockGetBytes).toHaveBeenCalledTimes(1);
    });

    it('evicts oldest entry when max capacity is reached', () => {
        for (let i = 0; i < 20; i++) {
            cache.set(`https://example.com/${i}.txt`, `content ${i}`);
        }
        expect(cache.size).toBe(20);

        cache.set('https://example.com/new.txt', 'new content');
        expect(cache.size).toBe(20);
    });

    it('reports correct size', () => {
        cache.set('https://a.com/1.txt', 'a');
        cache.set('https://a.com/2.txt', 'b');
        expect(cache.size).toBe(2);
    });
});
