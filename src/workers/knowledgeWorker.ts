/**
 * Knowledge Worker — offloads TF-IDF, similarity, and clustering from the main thread.
 * Communicates via structured postMessage protocol.
 */
import { computeClusters } from '@/features/clustering/services/similarityService';
import { rankEntries } from '@/features/knowledgeBank/services/relevanceScorer';
import type { CanvasNode } from '@/features/canvas/types/node';

export type WorkerRequest =
    | { type: 'computeClusters'; id: string; nodes: CanvasNode[]; options?: { minClusterSize?: number; similarityThreshold?: number } }
    | { type: 'rankEntries'; id: string; entries: Array<{ title: string; content: string; summary?: string; tags?: string[] }>; prompt: string };

export type WorkerResponse =
    | { type: 'computeClusters'; id: string; result: ReturnType<typeof computeClusters> }
    | { type: 'rankEntries'; id: string; result: unknown[] }
    | { type: 'error'; id: string; error: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const msg = event.data;
    try {
        switch (msg.type) {
            case 'computeClusters': {
                const result = computeClusters(msg.nodes, msg.options);
                self.postMessage({ type: 'computeClusters', id: msg.id, result } satisfies WorkerResponse);
                break;
            }
            case 'rankEntries': {
                const result = rankEntries(msg.entries, msg.prompt);
                self.postMessage({ type: 'rankEntries', id: msg.id, result } satisfies WorkerResponse);
                break;
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        self.postMessage({ type: 'error', id: msg.id, error: message } satisfies WorkerResponse);
    }
};
