/**
 * useLinkPreviewRetry - Retries link previews that previously failed (error: true)
 * Waits for Firebase auth to be ready before retrying.
 * Handles race condition with useWorkspaceLoader background refresh:
 *   when setNodes() replaces all nodes with Firestore data (still error: true),
 *   this hook will re-detect the errors and retry again.
 */
import { useEffect, useRef } from 'react';
import type { LinkPreviewMetadata } from '../types/node';
import { fetchLinkPreview } from '../services/linkPreviewService';
import { setInCache } from '../services/linkPreviewCache';
import { useCanvasStore } from '../stores/canvasStore';
import { auth } from '@/config/firebase';

/** Track which (nodeId, url) pairs we've already resolved to avoid infinite retries */
const resolvedKeys = new Set<string>();

/** Build a unique key for a (nodeId, url) pair */
function resolvedKey(nodeId: string, url: string): string {
    return `${nodeId}::${url}`;
}

/**
 * Retry fetching link previews that have error: true or low-quality metadata.
 * Tracks resolved keys per-node so the same URL can retry in different nodes.
 */
export function useLinkPreviewRetry(
    nodeId: string,
    linkPreviews?: Record<string, LinkPreviewMetadata>,
): void {
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!linkPreviews) return;

        // Retry URLs with errors OR low-quality previews (only domain, no real metadata)
        const errorUrls = Object.entries(linkPreviews)
            .filter(([url, meta]) => {
                if (resolvedKeys.has(resolvedKey(nodeId, url))) return false;
                if (meta.error) return true;
                // Retry if no real title (title === domain) and no image
                const hasRealTitle = meta.title && meta.title !== meta.domain;
                return !hasRealTitle && !meta.image;
            })
            .map(([url]) => url);

        if (errorUrls.length === 0) return;

        // Cancel any previous in-flight retry for this node
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        void waitForAuthThenRetry(nodeId, errorUrls, controller.signal);

        return () => { controller.abort(); };
    }, [nodeId, linkPreviews]);
}

/** Poll for auth readiness, then retry all error URLs */
async function waitForAuthThenRetry(
    nodeId: string,
    urls: string[],
    signal: AbortSignal,
): Promise<void> {
    const ready = await waitForAuth(signal);
    if (!ready || signal.aborted) return;
    await retryUrls(nodeId, urls, signal);
}

/** Wait for Firebase auth.currentUser to be available (up to 10s) */
async function waitForAuth(signal: AbortSignal): Promise<boolean> {
    const MAX_WAIT_MS = 10_000;
    const POLL_MS = 500;
    let elapsed = 0;

    while (elapsed < MAX_WAIT_MS) {
        if (signal.aborted) return false;
        if (auth.currentUser) return true;
        await new Promise((r) => setTimeout(r, POLL_MS));
        elapsed += POLL_MS;
    }
    return auth.currentUser !== null;
}

/** Re-fetch each error URL and update the store + cache */
async function retryUrls(
    nodeId: string,
    urls: string[],
    signal: AbortSignal,
): Promise<void> {
    const tasks = urls.map(async (url) => {
        if (signal.aborted) return;

        try {
            const metadata = await fetchLinkPreview(url, signal);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (signal.aborted) return;

            if (!metadata.error) {
                resolvedKeys.add(resolvedKey(nodeId, url));
                setInCache(url, metadata);
                useCanvasStore.getState().addLinkPreview(
                    nodeId, url, metadata,
                );
            }
        } catch {
            // Fetch was aborted or failed — will retry on next render
        }
    });

    await Promise.allSettled(tasks);
}

/** Reset resolved keys (for testing) */
export function resetResolvedUrls(): void {
    resolvedKeys.clear();
}
