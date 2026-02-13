/**
 * IndexedDB Service Tests
 * TDD: Verifies CRUD operations on IDB stores
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDbService, IDB_STORES } from '../indexedDbService';

// fake-indexeddb is auto-provided by jsdom in vitest

describe('indexedDbService', () => {
    beforeEach(async () => {
        indexedDbService.resetConnection();
        await indexedDbService.clear(IDB_STORES.workspaceData);
        await indexedDbService.clear(IDB_STORES.pinnedWorkspaces);
        await indexedDbService.clear(IDB_STORES.metadata);
    });

    describe('put and get', () => {
        it('stores and retrieves a value', async () => {
            await indexedDbService.put(IDB_STORES.workspaceData, 'key1', { data: 'test' });
            const result = await indexedDbService.get<{ data: string }>(IDB_STORES.workspaceData, 'key1');
            expect(result).toEqual({ data: 'test' });
        });

        it('returns undefined for missing key', async () => {
            const result = await indexedDbService.get(IDB_STORES.workspaceData, 'nonexistent');
            expect(result).toBeUndefined();
        });

        it('overwrites existing value', async () => {
            await indexedDbService.put(IDB_STORES.workspaceData, 'key1', { v: 1 });
            await indexedDbService.put(IDB_STORES.workspaceData, 'key1', { v: 2 });
            const result = await indexedDbService.get<{ v: number }>(IDB_STORES.workspaceData, 'key1');
            expect(result).toEqual({ v: 2 });
        });
    });

    describe('del', () => {
        it('deletes a value by key', async () => {
            await indexedDbService.put(IDB_STORES.workspaceData, 'key1', 'value');
            await indexedDbService.del(IDB_STORES.workspaceData, 'key1');
            const result = await indexedDbService.get(IDB_STORES.workspaceData, 'key1');
            expect(result).toBeUndefined();
        });

        it('returns true even when deleting nonexistent key', async () => {
            const result = await indexedDbService.del(IDB_STORES.workspaceData, 'nope');
            expect(result).toBe(true);
        });
    });

    describe('getAllKeys', () => {
        it('returns all keys in a store', async () => {
            await indexedDbService.put(IDB_STORES.workspaceData, 'a', 1);
            await indexedDbService.put(IDB_STORES.workspaceData, 'b', 2);
            const keys = await indexedDbService.getAllKeys(IDB_STORES.workspaceData);
            expect(keys).toContain('a');
            expect(keys).toContain('b');
        });

        it('returns empty array for empty store', async () => {
            const keys = await indexedDbService.getAllKeys(IDB_STORES.metadata);
            expect(keys).toEqual([]);
        });
    });

    describe('clear', () => {
        it('removes all entries in a store', async () => {
            await indexedDbService.put(IDB_STORES.workspaceData, 'a', 1);
            await indexedDbService.put(IDB_STORES.workspaceData, 'b', 2);
            await indexedDbService.clear(IDB_STORES.workspaceData);
            const keys = await indexedDbService.getAllKeys(IDB_STORES.workspaceData);
            expect(keys).toEqual([]);
        });
    });

    describe('cross-store isolation', () => {
        it('operations on one store do not affect another', async () => {
            await indexedDbService.put(IDB_STORES.workspaceData, 'shared-key', 'workspace');
            await indexedDbService.put(IDB_STORES.metadata, 'shared-key', 'meta');

            const wsResult = await indexedDbService.get<string>(IDB_STORES.workspaceData, 'shared-key');
            const metaResult = await indexedDbService.get<string>(IDB_STORES.metadata, 'shared-key');

            expect(wsResult).toBe('workspace');
            expect(metaResult).toBe('meta');
        });
    });
});
