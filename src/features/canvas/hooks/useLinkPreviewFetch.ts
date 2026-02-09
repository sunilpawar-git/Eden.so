/**
 * useLinkPreviewFetch - Debounced link preview fetcher
 * Detects new URLs, checks cache, fetches missing, updates canvasStore
 */
import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { fetchLinkPreview } from '../services/linkPreviewService';
import { getFromCache, setInCache } from '../services/linkPreviewCache';

/** Debounce delay before fetching (ms) */
const DEBOUNCE_MS = 500;

/**
 * Hook that fetches link previews for detected URLs in a node's content.
 * - Checks store first (already rendered), then cache, then network
 * - Debounces to avoid fetching on every keystroke
 * - Aborts in-flight requests on unmount or URL change
 */
export function useLinkPreviewFetch(nodeId: string, urls: string[]): void {
    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Clear previous debounce timer
        if (timerRef.current) clearTimeout(timerRef.current);

        if (urls.length === 0) return;

        timerRef.current = setTimeout(() => {
            // Abort any previous in-flight requests
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            void processUrls(nodeId, urls, controller.signal);
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            abortRef.current?.abort();
        };
    }, [nodeId, urls]);
}

/** Process a batch of URLs: skip known, use cache, fetch rest */
async function processUrls(
    nodeId: string,
    urls: string[],
    signal: AbortSignal,
): Promise<void> {
    const store = useCanvasStore.getState();
    const node = store.nodes.find((n) => n.id === nodeId);
    const existing = node?.data.linkPreviews ?? {};

    const toFetch = urls.filter((url) => !existing[url]);
    if (toFetch.length === 0) return;

    const tasks = toFetch.map(async (url) => {
        if (signal.aborted) return;

        // Check cache first
        const cached = getFromCache(url);
        if (cached) {
            useCanvasStore.getState().addLinkPreview(nodeId, url, cached);
            return;
        }

        // Fetch from network
        const metadata = await fetchLinkPreview(url, signal);
        if (signal.aborted) return;

        setInCache(url, metadata);
        useCanvasStore.getState().addLinkPreview(nodeId, url, metadata);
    });

    await Promise.allSettled(tasks);
}
