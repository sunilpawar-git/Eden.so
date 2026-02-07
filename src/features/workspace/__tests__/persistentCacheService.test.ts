/**
 * Persistent Cache Service Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { persistentCacheService } from '../services/persistentCacheService';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

const makeNode = (id = 'node-1'): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    data: { prompt: 'test' },
    position: { x: 0, y: 0 },
    width: 280,
    height: 150,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z'),
});

const makeEdge = (id = 'edge-1'): CanvasEdge => ({
    id,
    workspaceId: 'ws-1',
    sourceNodeId: 'node-1',
    targetNodeId: 'node-2',
    relationshipType: 'related',
});

describe('persistentCacheService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('workspace data', () => {
        it('should return null when no data stored', () => {
            expect(persistentCacheService.getWorkspaceData('ws-1')).toBeNull();
        });

        it('should set and get workspace data', () => {
            const nodes = [makeNode()];
            const edges = [makeEdge()];
            persistentCacheService.setWorkspaceData('ws-1', {
                nodes, edges, loadedAt: 1000,
            });

            const result = persistentCacheService.getWorkspaceData('ws-1');
            expect(result).not.toBeNull();
            expect(result!.nodes).toHaveLength(1);
            expect(result!.edges).toHaveLength(1);
            expect(result!.loadedAt).toBe(1000);
        });

        it('should deserialize node Date fields correctly', () => {
            persistentCacheService.setWorkspaceData('ws-1', {
                nodes: [makeNode()], edges: [], loadedAt: 1000,
            });

            const result = persistentCacheService.getWorkspaceData('ws-1');
            expect(result!.nodes[0]!.createdAt).toBeInstanceOf(Date);
            expect(result!.nodes[0]!.updatedAt).toBeInstanceOf(Date);
        });

        it('should remove workspace data', () => {
            persistentCacheService.setWorkspaceData('ws-1', {
                nodes: [], edges: [], loadedAt: 1000,
            });
            persistentCacheService.removeWorkspaceData('ws-1');
            expect(persistentCacheService.getWorkspaceData('ws-1')).toBeNull();
        });
    });

    describe('workspace metadata', () => {
        it('should return empty array when nothing stored', () => {
            expect(persistentCacheService.getWorkspaceMetadata()).toEqual([]);
        });

        it('should set and get workspace metadata', () => {
            const metadata = [
                { id: 'ws-1', name: 'Workspace 1', updatedAt: 1000 },
                { id: 'ws-2', name: 'Workspace 2', updatedAt: 2000 },
            ];
            persistentCacheService.setWorkspaceMetadata(metadata);
            expect(persistentCacheService.getWorkspaceMetadata()).toEqual(metadata);
        });
    });

    describe('LRU eviction', () => {
        it('should evict oldest entries when exceeding max cached workspaces', () => {
            // Fill cache with 20 workspaces
            for (let i = 0; i < 22; i++) {
                persistentCacheService.setWorkspaceData(`ws-${i}`, {
                    nodes: [], edges: [], loadedAt: i,
                });
            }

            // Oldest should be evicted
            expect(persistentCacheService.getWorkspaceData('ws-0')).toBeNull();
            expect(persistentCacheService.getWorkspaceData('ws-1')).toBeNull();
            // Newest should still exist
            expect(persistentCacheService.getWorkspaceData('ws-21')).not.toBeNull();
        });
    });

    describe('clear', () => {
        it('should remove all cached workspace data', () => {
            persistentCacheService.setWorkspaceData('ws-1', {
                nodes: [], edges: [], loadedAt: 1000,
            });
            persistentCacheService.setWorkspaceMetadata([
                { id: 'ws-1', name: 'Test', updatedAt: 1000 },
            ]);
            persistentCacheService.clear();
            expect(persistentCacheService.getWorkspaceData('ws-1')).toBeNull();
            expect(persistentCacheService.getWorkspaceMetadata()).toEqual([]);
        });
    });

    describe('localStorage unavailable', () => {
        it('should not throw when localStorage throws on read', () => {
            const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage unavailable');
            });
            expect(persistentCacheService.getWorkspaceData('ws-1')).toBeNull();
            spy.mockRestore();
        });

        it('should not throw when localStorage throws on write', () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Quota exceeded');
            });
            expect(() => persistentCacheService.setWorkspaceData('ws-1', {
                nodes: [], edges: [], loadedAt: 1000,
            })).not.toThrow();
            spy.mockRestore();
        });
    });
});
