/**
 * Offline Queue Service - localStorage-backed save queue
 * SOLID SRP: Only manages queue persistence, no network logic
 */
import { getStorageJson, setStorageJson } from '@/shared/utils/storage';
import type { QueuedSaveOperation } from '../types/offlineQueue';

const QUEUE_STORAGE_KEY = 'offline-save-queue';
const MAX_QUEUE_SIZE = 50;

interface OfflineQueueService {
    getQueue(): QueuedSaveOperation[];
    enqueue(op: QueuedSaveOperation): void;
    dequeue(operationId: string): void;
    getOldestOperation(): QueuedSaveOperation | null;
    size(): number;
    clear(): void;
}

function getQueue(): QueuedSaveOperation[] {
    return getStorageJson<QueuedSaveOperation[]>(QUEUE_STORAGE_KEY, []);
}

function persistQueue(queue: QueuedSaveOperation[]): void {
    setStorageJson(QUEUE_STORAGE_KEY, queue);
}

function enqueue(op: QueuedSaveOperation): void {
    let queue = getQueue();

    // Coalesce: replace existing operation for same workspace (latest state wins)
    queue = queue.filter((existing) => existing.workspaceId !== op.workspaceId);
    queue.push(op);

    // Enforce max size: drop oldest if over limit
    if (queue.length > MAX_QUEUE_SIZE) {
        queue.sort((a, b) => a.queuedAt - b.queuedAt);
        queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
    }

    persistQueue(queue);
}

function dequeue(operationId: string): void {
    const queue = getQueue().filter((op) => op.id !== operationId);
    persistQueue(queue);
}

function getOldestOperation(): QueuedSaveOperation | null {
    const queue = getQueue();
    if (queue.length === 0) return null;

    return queue.reduce((oldest, current) =>
        current.queuedAt < oldest.queuedAt ? current : oldest
    );
}

function size(): number {
    return getQueue().length;
}

function clear(): void {
    persistQueue([]);
}

export const offlineQueueService: OfflineQueueService = {
    getQueue,
    enqueue,
    dequeue,
    getOldestOperation,
    size,
    clear,
};
