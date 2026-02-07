/**
 * WorkspaceCache Service Tests
 * TDD: RED phase - tests written before implementation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    workspaceCache,
    WorkspaceData,
} from '../services/workspaceCache';

// Mock workspace service
vi.mock('../services/workspaceService', () => ({
    loadNodes: vi.fn(),
    loadEdges: vi.fn(),
}));

describe('WorkspaceCache', () => {
    beforeEach(() => {
        workspaceCache.clear();
        vi.clearAllMocks();
    });

    describe('get', () => {
        it('returns null for cache miss', () => {
            const result = workspaceCache.get('non-existent-id');
            expect(result).toBeNull();
        });

        it('returns cached data for cache hit', () => {
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };
            workspaceCache.set('workspace-1', testData);

            const result = workspaceCache.get('workspace-1');
            expect(result).toEqual(testData);
        });
    });

    describe('set', () => {
        it('caches workspace data', () => {
            const testData: WorkspaceData = {
                nodes: [{ id: 'node-1' }] as WorkspaceData['nodes'],
                edges: [{ id: 'edge-1' }] as WorkspaceData['edges'],
                loadedAt: Date.now(),
            };
            workspaceCache.set('workspace-2', testData);

            expect(workspaceCache.has('workspace-2')).toBe(true);
            expect(workspaceCache.get('workspace-2')).toEqual(testData);
        });
    });

    describe('invalidate', () => {
        it('invalidates specific workspace cache', () => {
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };
            workspaceCache.set('workspace-1', testData);
            workspaceCache.set('workspace-2', testData);

            workspaceCache.invalidate('workspace-1');

            expect(workspaceCache.has('workspace-1')).toBe(false);
            expect(workspaceCache.has('workspace-2')).toBe(true);
        });
    });

    describe('clear', () => {
        it('clears all cache', () => {
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };
            workspaceCache.set('workspace-1', testData);
            workspaceCache.set('workspace-2', testData);

            workspaceCache.clear();

            expect(workspaceCache.has('workspace-1')).toBe(false);
            expect(workspaceCache.has('workspace-2')).toBe(false);
        });
    });

    describe('has', () => {
        it('returns false when workspace not in cache', () => {
            expect(workspaceCache.has('unknown')).toBe(false);
        });

        it('returns true when workspace is in cache', () => {
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };
            workspaceCache.set('workspace-1', testData);

            expect(workspaceCache.has('workspace-1')).toBe(true);
        });
    });

    describe('update', () => {
        it('updates cache with new nodes and edges', () => {
            // First set some initial data
            workspaceCache.set('workspace-1', {
                nodes: [],
                edges: [],
                loadedAt: Date.now() - 1000,
            });

            const newNodes = [{ id: 'node-1' }] as WorkspaceData['nodes'];
            const newEdges = [{ id: 'edge-1' }] as WorkspaceData['edges'];

            workspaceCache.update('workspace-1', newNodes, newEdges);

            const result = workspaceCache.get('workspace-1');
            expect(result?.nodes).toEqual(newNodes);
            expect(result?.edges).toEqual(newEdges);
        });

        it('updates loadedAt timestamp', () => {
            const oldTime = Date.now() - 10000;
            workspaceCache.set('workspace-1', {
                nodes: [],
                edges: [],
                loadedAt: oldTime,
            });

            workspaceCache.update('workspace-1', [], []);

            const result = workspaceCache.get('workspace-1');
            expect(result?.loadedAt).toBeGreaterThan(oldTime);
        });
    });

    describe('persistent cache fallthrough', () => {
        it('falls through to persistent cache on memory miss', async () => {
            const { persistentCacheService } = await import('../services/persistentCacheService');
            const testData: WorkspaceData = {
                nodes: [{ id: 'node-1', createdAt: new Date(), updatedAt: new Date() }] as WorkspaceData['nodes'],
                edges: [],
                loadedAt: Date.now(),
            };
            // Put data in persistent cache only (not in-memory)
            persistentCacheService.setWorkspaceData('ws-persist', testData);

            const result = workspaceCache.get('ws-persist');
            expect(result).not.toBeNull();
            expect(result!.nodes).toHaveLength(1);
        });

        it('writes through to persistent on set', async () => {
            const { persistentCacheService } = await import('../services/persistentCacheService');
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };
            workspaceCache.set('ws-through', testData);

            const persisted = persistentCacheService.getWorkspaceData('ws-through');
            expect(persisted).not.toBeNull();
            expect(persisted!.loadedAt).toBe(testData.loadedAt);
        });

        it('removes from persistent on invalidate', async () => {
            const { persistentCacheService } = await import('../services/persistentCacheService');
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };
            workspaceCache.set('ws-rm', testData);
            workspaceCache.invalidate('ws-rm');

            expect(persistentCacheService.getWorkspaceData('ws-rm')).toBeNull();
        });
    });

    describe('preload', () => {
        it('preloads multiple workspaces', async () => {
            const { loadNodes, loadEdges } = await import('../services/workspaceService');
            const mockLoadNodes = vi.mocked(loadNodes);
            const mockLoadEdges = vi.mocked(loadEdges);

            mockLoadNodes.mockResolvedValue([]);
            mockLoadEdges.mockResolvedValue([]);

            await workspaceCache.preload('user-1', ['ws-1', 'ws-2']);

            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-1');
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-2');
            expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-1');
            expect(mockLoadEdges).toHaveBeenCalledWith('user-1', 'ws-2');
            expect(workspaceCache.has('ws-1')).toBe(true);
            expect(workspaceCache.has('ws-2')).toBe(true);
        });

        it('skips already cached workspaces', async () => {
            const { loadNodes, loadEdges } = await import('../services/workspaceService');
            const mockLoadNodes = vi.mocked(loadNodes);
            const mockLoadEdges = vi.mocked(loadEdges);

            mockLoadNodes.mockResolvedValue([]);
            mockLoadEdges.mockResolvedValue([]);

            // Pre-cache one workspace
            workspaceCache.set('ws-1', { nodes: [], edges: [], loadedAt: Date.now() });

            await workspaceCache.preload('user-1', ['ws-1', 'ws-2']);

            // Should only load ws-2
            expect(mockLoadNodes).not.toHaveBeenCalledWith('user-1', 'ws-1');
            expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-2');
        });
    });
});
