import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    extractStorageUrls,
    collectNodeStorageUrls,
    deleteStorageUrls,
    cleanupDeletedNodeStorage,
} from '../nodeStorageCleanup';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('firebase/storage', () => ({
    ref: vi.fn((_s, path: string) => ({ path })),
    deleteObject: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/config/firebase', () => ({
    storage: {},
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const MOCK_URL = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fimg.png?alt=media';
const MOCK_URL_2 = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Fdoc.pdf?alt=media';

describe('extractStorageUrls', () => {
    it('extracts Firebase Storage URLs from markdown content', () => {
        const md = `Some text ![img](${MOCK_URL}) and more`;
        const urls = extractStorageUrls(md);
        expect(urls).toHaveLength(1);
        expect(urls[0]).toBe(MOCK_URL);
    });

    it('returns empty array for text without Firebase URLs', () => {
        expect(extractStorageUrls('Hello world')).toEqual([]);
    });
});

describe('collectNodeStorageUrls', () => {
    it('collects URLs from node data string fields', () => {
        const node = {
            id: 'n1', type: 'idea', position: { x: 0, y: 0 },
            data: { output: `Content with ${MOCK_URL} image` },
        } as unknown as CanvasNode;
        const urls = collectNodeStorageUrls(node);
        expect(urls).toContain(MOCK_URL);
    });

    it('collects URLs from attachments array', () => {
        const node = {
            id: 'n1', type: 'idea', position: { x: 0, y: 0 },
            data: {
                output: 'text',
                attachments: [
                    { url: MOCK_URL, thumbnailUrl: MOCK_URL_2, parsedTextUrl: undefined },
                ],
            },
        } as unknown as CanvasNode;
        const urls = collectNodeStorageUrls(node);
        expect(urls).toContain(MOCK_URL);
        expect(urls).toContain(MOCK_URL_2);
    });

    it('deduplicates URLs', () => {
        const node = {
            id: 'n1', type: 'idea', position: { x: 0, y: 0 },
            data: { output: `${MOCK_URL} ${MOCK_URL}` },
        } as unknown as CanvasNode;
        expect(collectNodeStorageUrls(node)).toHaveLength(1);
    });

    it('returns empty for node without data', () => {
        const node = { id: 'n1', type: 'idea', position: { x: 0, y: 0 }, data: {} } as unknown as CanvasNode;
        expect(collectNodeStorageUrls(node)).toEqual([]);
    });
});

describe('deleteStorageUrls', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('calls deleteObject for each URL', async () => {
        const { deleteObject } = await import('firebase/storage');
        await deleteStorageUrls([MOCK_URL, MOCK_URL_2]);
        expect(deleteObject).toHaveBeenCalledTimes(2);
    });

    it('handles empty array gracefully', async () => {
        const { deleteObject } = await import('firebase/storage');
        await deleteStorageUrls([]);
        expect(deleteObject).not.toHaveBeenCalled();
    });

    it('does not throw when deleteObject fails', async () => {
        const { deleteObject } = await import('firebase/storage');
        vi.mocked(deleteObject).mockRejectedValueOnce(new Error('not found'));
        await expect(deleteStorageUrls([MOCK_URL])).resolves.toBeUndefined();
    });
});

describe('cleanupDeletedNodeStorage', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('deletes storage files for all deleted nodes', async () => {
        const { deleteObject } = await import('firebase/storage');
        const nodes = [
            { id: 'n1', type: 'idea', position: { x: 0, y: 0 }, data: { output: `img ${MOCK_URL}` } },
            { id: 'n2', type: 'idea', position: { x: 0, y: 0 }, data: { output: `doc ${MOCK_URL_2}` } },
        ] as unknown as CanvasNode[];
        await cleanupDeletedNodeStorage(nodes);
        expect(deleteObject).toHaveBeenCalledTimes(2);
    });

    it('skips cleanup when no nodes have storage files', async () => {
        const { deleteObject } = await import('firebase/storage');
        const nodes = [
            { id: 'n1', type: 'idea', position: { x: 0, y: 0 }, data: { output: 'plain text' } },
        ] as unknown as CanvasNode[];
        await cleanupDeletedNodeStorage(nodes);
        expect(deleteObject).not.toHaveBeenCalled();
    });
});
