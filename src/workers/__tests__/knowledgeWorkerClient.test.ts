import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeClustersAsync, rankEntriesAsync, terminateWorker } from '../knowledgeWorkerClient';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('@/features/clustering/services/similarityService', () => ({
    computeClusters: vi.fn(() => ({ clusters: [], unclustered: [] })),
}));

vi.mock('@/features/knowledgeBank/services/relevanceScorer', () => ({
    rankEntries: vi.fn((entries: unknown[]) => entries),
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('knowledgeWorkerClient (main-thread fallback)', () => {
    beforeEach(() => {
        terminateWorker();
    });

    it('computeClustersAsync returns cluster result', async () => {
        const nodes: CanvasNode[] = [];
        const result = await computeClustersAsync(nodes);
        expect(result).toHaveProperty('clusters');
        expect(result).toHaveProperty('unclustered');
    });

    it('rankEntriesAsync returns entries in order', async () => {
        const entries = [{ title: 'A', content: 'hello' }, { title: 'B', content: 'world' }];
        const result = await rankEntriesAsync(entries, 'hello');
        expect(result).toHaveLength(2);
    });

    it('terminateWorker is safe to call multiple times', () => {
        expect(() => { terminateWorker(); terminateWorker(); }).not.toThrow();
    });
});
