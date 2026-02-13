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

// Mock idbCacheService to avoid real IDB and serialization errors
const mockSetWorkspaceData = vi.fn().mockResolvedValue(undefined);
const mockGetWorkspaceData = vi.fn().mockResolvedValue(null);
const mockRemoveWorkspaceData = vi.fn().mockResolvedValue(undefined);
const mockClearIdb = vi.fn().mockResolvedValue(undefined);
const mockGetLruOrder = vi.fn().mockResolvedValue([]);

vi.mock('../services/idbCacheService', () => ({
    idbCacheService: {
        setWorkspaceData: (...args: unknown[]) => mockSetWorkspaceData(...args),
        getWorkspaceData: (...args: unknown[]) => mockGetWorkspaceData(...args),
        removeWorkspaceData: (...args: unknown[]) => mockRemoveWorkspaceData(...args),
        clear: () => mockClearIdb(),
        getLruOrder: () => mockGetLruOrder(),
    },
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

    describe('IDB write-through', () => {
        it('returns null for memory miss (get is memory-only)', () => {
            const result = workspaceCache.get('ws-nonexistent');
            expect(result).toBeNull();
        });

        it('writes through to IDB on set', async () => {
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };
            workspaceCache.set('ws-through', testData);

            // IDB write is fire-and-forget, give it a tick
            await new Promise((r) => setTimeout(r, 10));
            expect(mockSetWorkspaceData).toHaveBeenCalledWith('ws-through', testData);
        });

        it('removes from IDB on invalidate', async () => {
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };
            workspaceCache.set('ws-rm', testData);
            workspaceCache.invalidate('ws-rm');

            await new Promise((r) => setTimeout(r, 10));
            expect(mockRemoveWorkspaceData).toHaveBeenCalledWith('ws-rm');
        });

        it('hydrates memory from IDB via hydrateFromIdb', async () => {
            const testData: WorkspaceData = {
                nodes: [],
                edges: [],
                loadedAt: Date.now(),
            };

            // Simulate IDB returning data for hydration
            mockGetLruOrder.mockResolvedValue(['ws-hydrate']);
            mockGetWorkspaceData.mockResolvedValue(testData);

            // Clear memory cache to simulate fresh startup
            workspaceCache.clear();

            await workspaceCache.hydrateFromIdb();

            const result = workspaceCache.get('ws-hydrate');
            expect(result).not.toBeNull();
            expect(result!.loadedAt).toBe(testData.loadedAt);
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
