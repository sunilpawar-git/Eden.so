/**
 * Workspace Service Save Tests - Delete Sync Feature
 * Tests for saving nodes/edges with delete synchronization
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveNodes, saveEdges } from '../services/workspaceService';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

// Mock Firestore
vi.mock('@/config/firebase', () => ({
    db: {},
}));

// Mock Firestore functions
const mockGetDocs = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
    doc: vi.fn((_, ...path: string[]) => ({ id: path[path.length - 1] })),
    collection: vi.fn(() => ({ id: 'mock-collection' })),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    writeBatch: vi.fn(() => ({
        set: mockBatchSet,
        delete: mockBatchDelete,
        commit: mockBatchCommit,
    })),
    serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

describe('WorkspaceService Save with Delete Sync', () => {
    beforeEach(() => {
        mockGetDocs.mockReset();
        mockBatchSet.mockReset();
        mockBatchDelete.mockReset();
        mockBatchCommit.mockReset().mockResolvedValue(undefined);
    });

    describe('saveNodes', () => {
        const createMockNode = (id: string): CanvasNode => ({
            id,
            workspaceId: 'ws-1',
            type: 'idea',
            data: { prompt: 'Test' },
            position: { x: 0, y: 0 },
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        it('should delete nodes from Firestore that no longer exist locally', async () => {
            mockGetDocs.mockResolvedValue({
                docs: [
                    { id: 'node-a' },
                    { id: 'node-b' },
                    { id: 'node-c' },
                ],
            });

            await saveNodes('user-1', 'ws-1', [
                createMockNode('node-a'),
                createMockNode('node-b'),
            ]);

            expect(mockBatchDelete).toHaveBeenCalled();
            expect(mockBatchCommit).toHaveBeenCalled();
        });

        it('should save all current nodes', async () => {
            mockGetDocs.mockResolvedValue({ docs: [] });

            await saveNodes('user-1', 'ws-1', [
                createMockNode('node-a'),
                createMockNode('node-b'),
            ]);

            expect(mockBatchSet).toHaveBeenCalledTimes(2);
            expect(mockBatchCommit).toHaveBeenCalled();
        });

        it('should handle empty nodes array', async () => {
            mockGetDocs.mockResolvedValue({
                docs: [{ id: 'node-a' }],
            });

            await saveNodes('user-1', 'ws-1', []);

            expect(mockBatchDelete).toHaveBeenCalled();
            expect(mockBatchCommit).toHaveBeenCalled();
        });
    });

    describe('saveEdges', () => {
        const createMockEdge = (id: string): CanvasEdge => ({
            id,
            workspaceId: 'ws-1',
            sourceNodeId: 'node-1',
            targetNodeId: 'node-2',
            relationshipType: 'related',
        });

        it('should delete edges from Firestore that no longer exist locally', async () => {
            mockGetDocs.mockResolvedValue({
                docs: [
                    { id: 'edge-a' },
                    { id: 'edge-b' },
                ],
            });

            await saveEdges('user-1', 'ws-1', [createMockEdge('edge-a')]);

            expect(mockBatchDelete).toHaveBeenCalled();
            expect(mockBatchCommit).toHaveBeenCalled();
        });

        it('should save all current edges', async () => {
            mockGetDocs.mockResolvedValue({ docs: [] });

            await saveEdges('user-1', 'ws-1', [
                createMockEdge('edge-a'),
                createMockEdge('edge-b'),
            ]);

            expect(mockBatchSet).toHaveBeenCalledTimes(2);
            expect(mockBatchCommit).toHaveBeenCalled();
        });
    });
});
