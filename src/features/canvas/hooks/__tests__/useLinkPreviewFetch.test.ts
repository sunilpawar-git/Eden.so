/**
 * useLinkPreviewFetch Hook Tests
 * TDD: Validates debounced fetching, cache integration, store updates, abort on unmount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLinkPreviewFetch } from '../useLinkPreviewFetch';
import { useCanvasStore } from '../../stores/canvasStore';
import * as cache from '../../services/linkPreviewCache';
import * as service from '../../services/linkPreviewService';
import type { LinkPreviewMetadata } from '../../types/node';

vi.mock('../../services/linkPreviewService', () => ({
    fetchLinkPreview: vi.fn(),
    extractDomain: vi.fn((url: string) => {
        try { return new URL(url).hostname; } catch { return ''; }
    }),
}));

vi.mock('../../services/linkPreviewCache', () => ({
    getFromCache: vi.fn(),
    setInCache: vi.fn(),
    isStale: vi.fn(() => false),
    CACHE_TTL_MS: 86_400_000,
}));

const mockPreview = (url: string): LinkPreviewMetadata => ({
    url,
    title: `Title for ${url}`,
    domain: 'example.com',
    fetchedAt: Date.now(),
});

describe('useLinkPreviewFetch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        useCanvasStore.getState().clearCanvas();
        useCanvasStore.getState().addNode({
            id: 'node-1', workspaceId: 'ws-1', type: 'idea',
            position: { x: 0, y: 0 },
            data: { prompt: '', output: '' },
            createdAt: new Date(), updatedAt: new Date(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does nothing when urls array is empty', () => {
        renderHook(() => useLinkPreviewFetch('node-1', []));
        act(() => { vi.advanceTimersByTime(600); });
        expect(service.fetchLinkPreview).not.toHaveBeenCalled();
    });

    it('fetches preview for a URL after debounce', async () => {
        const preview = mockPreview('https://example.com');
        vi.mocked(cache.getFromCache).mockReturnValue(null);
        vi.mocked(service.fetchLinkPreview).mockResolvedValue(preview);

        renderHook(() => useLinkPreviewFetch('node-1', ['https://example.com']));

        // Before debounce — no fetch
        expect(service.fetchLinkPreview).not.toHaveBeenCalled();

        // After debounce
        await act(async () => {
            vi.advanceTimersByTime(600);
            // Flush microtasks
            await Promise.resolve();
        });

        expect(service.fetchLinkPreview).toHaveBeenCalledWith(
            'https://example.com', expect.any(AbortSignal),
        );
    });

    it('skips fetch when cache has a fresh entry', async () => {
        const cached = mockPreview('https://cached.com');
        vi.mocked(cache.getFromCache).mockReturnValue(cached);

        renderHook(() => useLinkPreviewFetch('node-1', ['https://cached.com']));
        await act(async () => {
            vi.advanceTimersByTime(600);
            await Promise.resolve();
        });

        expect(service.fetchLinkPreview).not.toHaveBeenCalled();
    });

    it('updates the store after successful fetch', async () => {
        const preview = mockPreview('https://new.com');
        vi.mocked(cache.getFromCache).mockReturnValue(null);
        vi.mocked(service.fetchLinkPreview).mockResolvedValue(preview);

        renderHook(() => useLinkPreviewFetch('node-1', ['https://new.com']));
        await act(async () => {
            vi.advanceTimersByTime(600);
            await Promise.resolve();
        });

        const node = useCanvasStore.getState().nodes[0]!;
        expect(node.data.linkPreviews?.['https://new.com']).toEqual(preview);
    });

    it('writes fetched preview to cache', async () => {
        const preview = mockPreview('https://cache-me.com');
        vi.mocked(cache.getFromCache).mockReturnValue(null);
        vi.mocked(service.fetchLinkPreview).mockResolvedValue(preview);

        renderHook(() => useLinkPreviewFetch('node-1', ['https://cache-me.com']));
        await act(async () => {
            vi.advanceTimersByTime(600);
            await Promise.resolve();
        });

        expect(cache.setInCache).toHaveBeenCalledWith('https://cache-me.com', preview);
    });

    it('updates store with cached entry instead of fetching', async () => {
        const cached = mockPreview('https://cached.com');
        vi.mocked(cache.getFromCache).mockReturnValue(cached);

        renderHook(() => useLinkPreviewFetch('node-1', ['https://cached.com']));
        await act(async () => {
            vi.advanceTimersByTime(600);
            await Promise.resolve();
        });

        const node = useCanvasStore.getState().nodes[0]!;
        expect(node.data.linkPreviews?.['https://cached.com']).toEqual(cached);
    });

    it('handles multiple URLs in parallel', async () => {
        vi.mocked(cache.getFromCache).mockReturnValue(null);
        const previewA = mockPreview('https://a.com');
        const previewB = mockPreview('https://b.com');
        vi.mocked(service.fetchLinkPreview)
            .mockResolvedValueOnce(previewA)
            .mockResolvedValueOnce(previewB);

        renderHook(() => useLinkPreviewFetch('node-1', ['https://a.com', 'https://b.com']));
        await act(async () => {
            vi.advanceTimersByTime(600);
            await Promise.resolve();
        });

        expect(service.fetchLinkPreview).toHaveBeenCalledTimes(2);
    });

    it('does not re-fetch URLs already in the store', async () => {
        // Pre-populate a preview in the store
        const existing = mockPreview('https://exists.com');
        useCanvasStore.getState().addLinkPreview('node-1', 'https://exists.com', existing);
        vi.mocked(cache.getFromCache).mockReturnValue(null);

        renderHook(() => useLinkPreviewFetch('node-1', ['https://exists.com']));
        await act(async () => {
            vi.advanceTimersByTime(600);
            await Promise.resolve();
        });

        expect(service.fetchLinkPreview).not.toHaveBeenCalled();
    });

    it('debounces rapid URL changes', async () => {
        vi.mocked(cache.getFromCache).mockReturnValue(null);
        vi.mocked(service.fetchLinkPreview).mockResolvedValue(mockPreview('https://final.com'));

        const { rerender } = renderHook(
            ({ urls }: { urls: string[] }) => useLinkPreviewFetch('node-1', urls),
            { initialProps: { urls: ['https://first.com'] } },
        );

        // Change URLs rapidly before debounce fires
        act(() => { vi.advanceTimersByTime(200); });
        rerender({ urls: ['https://second.com'] });
        act(() => { vi.advanceTimersByTime(200); });
        rerender({ urls: ['https://final.com'] });

        await act(async () => {
            vi.advanceTimersByTime(600);
            await Promise.resolve();
        });

        // Should only have fetched the final URL, not earlier ones
        const calls = vi.mocked(service.fetchLinkPreview).mock.calls;
        const fetchedUrls = calls.map(c => c[0]);
        expect(fetchedUrls).not.toContain('https://first.com');
    });
});
