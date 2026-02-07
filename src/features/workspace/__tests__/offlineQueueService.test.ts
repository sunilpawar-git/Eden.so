/**
 * Offline Queue Service Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineQueueService } from '../services/offlineQueueService';
import type { QueuedSaveOperation } from '../types/offlineQueue';

const makeOperation = (overrides: Partial<QueuedSaveOperation> = {}): QueuedSaveOperation => ({
    id: `op-${Date.now()}`,
    userId: 'user-1',
    workspaceId: 'ws-1',
    nodes: [],
    edges: [],
    queuedAt: Date.now(),
    retryCount: 0,
    ...overrides,
});

describe('offlineQueueService', () => {
    beforeEach(() => {
        localStorage.clear();
        offlineQueueService.clear();
    });

    describe('getQueue', () => {
        it('should return empty array when nothing queued', () => {
            expect(offlineQueueService.getQueue()).toEqual([]);
        });
    });

    describe('enqueue', () => {
        it('should add operation to queue', () => {
            const op = makeOperation();
            offlineQueueService.enqueue(op);
            expect(offlineQueueService.size()).toBe(1);
        });

        it('should coalesce operations with same workspaceId', () => {
            const op1 = makeOperation({ id: 'op-1', workspaceId: 'ws-1', queuedAt: 1000 });
            const op2 = makeOperation({ id: 'op-2', workspaceId: 'ws-1', queuedAt: 2000 });

            offlineQueueService.enqueue(op1);
            offlineQueueService.enqueue(op2);

            expect(offlineQueueService.size()).toBe(1);
            const first = offlineQueueService.getQueue()[0]!;
            expect(first.id).toBe('op-2');
            expect(first.queuedAt).toBe(2000);
        });

        it('should keep operations for different workspaces separate', () => {
            offlineQueueService.enqueue(makeOperation({ workspaceId: 'ws-1' }));
            offlineQueueService.enqueue(makeOperation({ workspaceId: 'ws-2' }));

            expect(offlineQueueService.size()).toBe(2);
        });

        it('should persist to localStorage', () => {
            offlineQueueService.enqueue(makeOperation());
            const stored = localStorage.getItem('offline-save-queue');
            expect(stored).toBeTruthy();
            expect(JSON.parse(stored ?? '[]')).toHaveLength(1);
        });

        it('should enforce MAX_QUEUE_SIZE by dropping oldest', () => {
            for (let i = 0; i < 55; i++) {
                offlineQueueService.enqueue(
                    makeOperation({ id: `op-${i}`, workspaceId: `ws-${i}`, queuedAt: i })
                );
            }
            expect(offlineQueueService.size()).toBeLessThanOrEqual(50);
        });
    });

    describe('dequeue', () => {
        it('should remove specific operation by id', () => {
            const op = makeOperation({ id: 'op-remove' });
            offlineQueueService.enqueue(op);
            offlineQueueService.dequeue('op-remove');
            expect(offlineQueueService.size()).toBe(0);
        });

        it('should not affect other operations', () => {
            offlineQueueService.enqueue(makeOperation({ id: 'op-1', workspaceId: 'ws-1' }));
            offlineQueueService.enqueue(makeOperation({ id: 'op-2', workspaceId: 'ws-2' }));
            offlineQueueService.dequeue('op-1');
            expect(offlineQueueService.size()).toBe(1);
            expect(offlineQueueService.getQueue()[0]!.id).toBe('op-2');
        });
    });

    describe('getOldestOperation', () => {
        it('should return null when queue is empty', () => {
            expect(offlineQueueService.getOldestOperation()).toBeNull();
        });

        it('should return operation with lowest queuedAt', () => {
            offlineQueueService.enqueue(makeOperation({ id: 'newer', workspaceId: 'ws-1', queuedAt: 2000 }));
            offlineQueueService.enqueue(makeOperation({ id: 'oldest', workspaceId: 'ws-2', queuedAt: 1000 }));
            offlineQueueService.enqueue(makeOperation({ id: 'middle', workspaceId: 'ws-3', queuedAt: 1500 }));

            const oldest = offlineQueueService.getOldestOperation();
            expect(oldest?.id).toBe('oldest');
        });
    });

    describe('clear', () => {
        it('should empty the queue', () => {
            offlineQueueService.enqueue(makeOperation());
            offlineQueueService.clear();
            expect(offlineQueueService.size()).toBe(0);
        });
    });

    describe('size', () => {
        it('should reflect current queue count', () => {
            expect(offlineQueueService.size()).toBe(0);
            offlineQueueService.enqueue(makeOperation({ workspaceId: 'ws-1' }));
            expect(offlineQueueService.size()).toBe(1);
            offlineQueueService.enqueue(makeOperation({ workspaceId: 'ws-2' }));
            expect(offlineQueueService.size()).toBe(2);
        });
    });

    describe('localStorage persistence', () => {
        it('should survive service reload by reading from localStorage', () => {
            offlineQueueService.enqueue(makeOperation({ id: 'persisted', workspaceId: 'ws-persist' }));

            // Simulate fresh read from localStorage
            const queue = offlineQueueService.getQueue();
            expect(queue).toHaveLength(1);
            expect(queue[0]!.id).toBe('persisted');
        });
    });

    describe('localStorage unavailable', () => {
        it('should not throw when localStorage throws', () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Quota exceeded');
            });
            expect(() => offlineQueueService.enqueue(makeOperation())).not.toThrow();
            spy.mockRestore();
        });
    });
});
