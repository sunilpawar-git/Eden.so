/**
 * Knowledge Worker Client — Promise-based API for the knowledge web worker.
 * Falls back to synchronous main-thread execution if Workers are unavailable.
 */
import type { WorkerRequest, WorkerResponse } from './knowledgeWorker';
import { computeClusters as syncClusters } from '@/features/clustering/services/similarityService';
import { rankEntries as syncRank } from '@/features/knowledgeBank/services/relevanceScorer';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { ClusterGroup } from '@/features/clustering/types/cluster';
import { logger } from '@/shared/services/logger';

interface ClusterResult {
    clusters: ClusterGroup[];
    unclustered: readonly string[];
}

type PendingResolver = { resolve: (value: unknown) => void; reject: (err: Error) => void };

let worker: Worker | null = null;
const pending = new Map<string, PendingResolver>();
let requestId = 0;

function getWorker(): Worker | null {
    if (worker) return worker;
    if (typeof Worker === 'undefined') return null;
    try {
        worker = new Worker(new URL('./knowledgeWorker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            const { id } = e.data;
            const entry = pending.get(id);
            if (!entry) return;
            pending.delete(id);
            if (e.data.type === 'error') {
                entry.reject(new Error(e.data.error));
            } else {
                entry.resolve(e.data.result);
            }
        };
        worker.onerror = () => {
            logger.warn('[knowledgeWorkerClient] Worker error, falling back to main thread');
            terminateWorker();
        };
        return worker;
    } catch {
        return null;
    }
}

function postRequest<T>(msg: Record<string, unknown>): Promise<T> {
    const w = getWorker();
    const id = `kw-${++requestId}`;
    if (!w) {
        return runOnMainThread({ ...msg, id } as unknown as WorkerRequest) as Promise<T>;
    }
    return new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        w.postMessage({ ...msg, id });
    });
}

function runOnMainThread(msg: WorkerRequest): Promise<unknown> {
    switch (msg.type) {
        case 'computeClusters': return Promise.resolve(syncClusters(msg.nodes, msg.options));
        case 'rankEntries': return Promise.resolve(syncRank(msg.entries, msg.prompt));
    }
}

export function computeClustersAsync(
    nodes: CanvasNode[],
    options?: { minClusterSize?: number; similarityThreshold?: number },
): Promise<ClusterResult> {
    return postRequest<ClusterResult>({ type: 'computeClusters', nodes, options });
}

export function rankEntriesAsync<T extends { title: string; content: string; summary?: string; tags?: string[] }>(
    entries: T[], prompt: string,
): Promise<T[]> {
    return postRequest<T[]>({ type: 'rankEntries', entries, prompt });
}

export function terminateWorker(): void {
    worker?.terminate();
    worker = null;
    for (const [, entry] of pending) entry.reject(new Error('Worker terminated'));
    pending.clear();
}
