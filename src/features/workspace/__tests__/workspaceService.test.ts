/**
 * Workspace Service Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    saveWorkspace,
    loadWorkspace,
    loadNodes,
    loadEdges,
    createNewWorkspace,
} from '../services/workspaceService';

// Mock Firestore
vi.mock('@/config/firebase', () => ({
    db: {},
}));

// Mock Firestore functions
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => ({ id: 'mock-ref' })),
    collection: vi.fn(() => ({ id: 'mock-collection' })),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    writeBatch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
    })),
    serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

describe('WorkspaceService', () => {
    beforeEach(() => {
        mockSetDoc.mockReset();
        mockGetDoc.mockReset();
        mockGetDocs.mockReset();
    });

    describe('saveWorkspace', () => {
        it('should save workspace metadata to Firestore', async () => {
            mockSetDoc.mockResolvedValue(undefined);

            await saveWorkspace('user-1', {
                id: 'ws-1',
                userId: 'user-1',
                name: 'My Workspace',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            expect(mockSetDoc).toHaveBeenCalled();
        });
    });

    describe('loadWorkspace', () => {
        it('should load workspace from Firestore', async () => {
            const mockData = {
                id: 'ws-1',
                name: 'My Workspace',
                canvasSettings: { backgroundColor: 'grid' },
            };
            mockGetDoc.mockResolvedValue({
                exists: () => true,
                data: () => mockData,
            });

            const result = await loadWorkspace('user-1', 'ws-1');

            expect(mockGetDoc).toHaveBeenCalled();
            expect(result?.name).toBe('My Workspace');
        });

        it('should return null if workspace not found', async () => {
            mockGetDoc.mockResolvedValue({
                exists: () => false,
            });

            const result = await loadWorkspace('user-1', 'ws-nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('loadNodes', () => {
        it('should return empty array when no nodes exist', async () => {
            mockGetDocs.mockResolvedValue({ docs: [] });

            const result = await loadNodes('user-1', 'ws-1');

            expect(result).toEqual([]);
        });

        it('should return nodes with correct structure', async () => {
            const mockTimestamp = { toDate: () => new Date('2024-01-01') };
            mockGetDocs.mockResolvedValue({
                docs: [
                    {
                        data: () => ({
                            id: 'node-1',
                            type: 'idea',
                            data: { prompt: 'Test prompt', output: 'Test output' },
                            position: { x: 100, y: 200 },
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp,
                        }),
                    },
                    {
                        data: () => ({
                            id: 'node-2',
                            type: 'idea',
                            data: { prompt: 'Another prompt', output: undefined },
                            position: { x: 300, y: 400 },
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp,
                        }),
                    },
                ],
            });

            const result = await loadNodes('user-1', 'ws-1');

            expect(result).toHaveLength(2);
            const firstNode = result[0]!;
            const secondNode = result[1]!;
            expect(firstNode.id).toBe('node-1');
            expect(firstNode.type).toBe('idea');
            expect(firstNode.data.prompt).toBe('Test prompt');
            expect(firstNode.data.output).toBe('Test output');
            expect(firstNode.position).toEqual({ x: 100, y: 200 });
            expect(secondNode.id).toBe('node-2');
        });

        it('should handle nodes without timestamps gracefully', async () => {
            mockGetDocs.mockResolvedValue({
                docs: [
                    {
                        data: () => ({
                            id: 'node-1',
                            type: 'idea',
                            data: { prompt: 'Test' },
                            position: { x: 0, y: 0 },
                            // No createdAt/updatedAt
                        }),
                    },
                ],
            });

            const result = await loadNodes('user-1', 'ws-1');

            const node = result[0]!;
            expect(node.id).toBe('node-1');
            expect(node.createdAt).toBeInstanceOf(Date);
            expect(node.updatedAt).toBeInstanceOf(Date);
        });

        it('should restore width and height when present in Firestore', async () => {
            const mockTimestamp = { toDate: () => new Date('2024-01-01') };
            mockGetDocs.mockResolvedValue({
                docs: [
                    {
                        data: () => ({
                            id: 'node-1',
                            type: 'idea',
                            data: { prompt: 'Test prompt', output: 'Test output' },
                            position: { x: 100, y: 200 },
                            width: 350,
                            height: 200,
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp,
                        }),
                    },
                ],
            });

            const result = await loadNodes('user-1', 'ws-1');

            const node = result[0]!;
            expect(node.width).toBe(350);
            expect(node.height).toBe(200);
        });

        it('should handle nodes without width/height (default undefined)', async () => {
            const mockTimestamp = { toDate: () => new Date('2024-01-01') };
            mockGetDocs.mockResolvedValue({
                docs: [
                    {
                        data: () => ({
                            id: 'node-1',
                            type: 'idea',
                            data: { prompt: 'Test' },
                            position: { x: 0, y: 0 },
                            // No width/height
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp,
                        }),
                    },
                ],
            });

            const result = await loadNodes('user-1', 'ws-1');

            const node = result[0]!;
            expect(node.width).toBeUndefined();
            expect(node.height).toBeUndefined();
        });
    });

    describe('loadEdges', () => {
        it('should return empty array when no edges exist', async () => {
            mockGetDocs.mockResolvedValue({ docs: [] });

            const result = await loadEdges('user-1', 'ws-1');

            expect(result).toEqual([]);
        });

        it('should return edges with correct structure', async () => {
            mockGetDocs.mockResolvedValue({
                docs: [
                    {
                        data: () => ({
                            id: 'edge-1',
                            sourceNodeId: 'node-1',
                            targetNodeId: 'node-2',
                            relationshipType: 'related',
                        }),
                    },
                    {
                        data: () => ({
                            id: 'edge-2',
                            sourceNodeId: 'node-2',
                            targetNodeId: 'node-3',
                            relationshipType: 'derived',
                        }),
                    },
                ],
            });

            const result = await loadEdges('user-1', 'ws-1');

            expect(result).toHaveLength(2);
            const firstEdge = result[0]!;
            const secondEdge = result[1]!;
            expect(firstEdge.id).toBe('edge-1');
            expect(firstEdge.sourceNodeId).toBe('node-1');
            expect(firstEdge.targetNodeId).toBe('node-2');
            expect(firstEdge.relationshipType).toBe('related');
            expect(secondEdge.id).toBe('edge-2');
        });
    });

    // Save with delete sync tests are in workspaceService.save.test.ts

    describe('loadUserWorkspaces', () => {
        it('should return empty array when no workspaces exist', async () => {
            mockGetDocs.mockResolvedValue({ docs: [] });
            
            const { loadUserWorkspaces } = await import('../services/workspaceService');
            const result = await loadUserWorkspaces('user-1');

            expect(result).toEqual([]);
        });

        it('should return all workspaces for a user', async () => {
            const mockTimestamp = { toDate: () => new Date('2024-01-01') };
            mockGetDocs.mockResolvedValue({
                docs: [
                    {
                        data: () => ({
                            id: 'ws-1',
                            name: 'Workspace 1',
                            canvasSettings: { backgroundColor: 'grid' },
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp,
                        }),
                    },
                    {
                        data: () => ({
                            id: 'ws-2',
                            name: 'Workspace 2',
                            canvasSettings: { backgroundColor: 'dots' },
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp,
                        }),
                    },
                ],
            });

            const { loadUserWorkspaces } = await import('../services/workspaceService');
            const result = await loadUserWorkspaces('user-1');

            expect(result).toHaveLength(2);
            const ws1 = result[0]!;
            const ws2 = result[1]!;
            expect(ws1.id).toBe('ws-1');
            expect(ws1.name).toBe('Workspace 1');
            expect(ws1.userId).toBe('user-1');
            expect(ws2.id).toBe('ws-2');
            expect(ws2.name).toBe('Workspace 2');
        });
    });

    describe('createNewWorkspace', () => {
        it('should create a new workspace with generated ID', async () => {
            mockSetDoc.mockResolvedValue(undefined);

            const result = await createNewWorkspace('user-1', 'My New Workspace');

            expect(mockSetDoc).toHaveBeenCalled();
            expect(result.name).toBe('My New Workspace');
            expect(result.userId).toBe('user-1');
            expect(result.id).toBeDefined();
            expect(result.id.length).toBeGreaterThan(0);
        });

        it('should use default name if none provided', async () => {
            mockSetDoc.mockResolvedValue(undefined);

            const result = await createNewWorkspace('user-1');

            expect(result.name).toBe('Untitled Workspace');
        });
    });
});
