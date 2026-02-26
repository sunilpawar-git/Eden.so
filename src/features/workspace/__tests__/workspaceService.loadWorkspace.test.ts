/**
 * Workspace Service Load Tests - loadWorkspace, loadUserWorkspaces
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadWorkspace } from '../services/workspaceService';

vi.mock('@/config/firebase', () => ({ db: {} }));

const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockGetCountFromServer = vi.fn();

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => ({ id: 'mock-ref' })),
    collection: vi.fn(() => ({ id: 'mock-collection' })),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    getCountFromServer: (...args: unknown[]) => mockGetCountFromServer(...args),
    writeBatch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
    })),
    serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

describe('WorkspaceService loadWorkspace', () => {
    beforeEach(() => {
        mockGetDoc.mockReset();
        mockGetDocs.mockReset();
        mockSetDoc.mockReset();
        mockGetCountFromServer.mockReset();
        mockSetDoc.mockResolvedValue(undefined);
        mockGetCountFromServer.mockResolvedValue({
            data: () => ({ count: 0 }),
        });
    });

    describe('loadWorkspace', () => {
        it('should load workspace from Firestore', async () => {
            const mockData = {
                id: 'ws-1',
                name: 'My Workspace',
                canvasSettings: { backgroundColor: 'grid' },
                nodeCount: 0,
            };
            mockGetDoc.mockResolvedValue({
                exists: () => true,
                data: () => mockData,
            });

            const result = await loadWorkspace('user-1', 'ws-1');

            expect(mockGetDoc).toHaveBeenCalled();
            expect(result?.name).toBe('My Workspace');
            expect(result?.nodeCount).toBe(0);
            expect(mockGetCountFromServer).not.toHaveBeenCalled();
        });

        it('should backfill nodeCount using getCountFromServer if missing', async () => {
            const mockData = {
                id: 'ws-legacy',
                name: 'Legacy Workspace',
                canvasSettings: { backgroundColor: 'grid' },
                type: 'workspace'
            };
            mockGetDoc.mockResolvedValue({
                exists: () => true,
                data: () => mockData,
            });
            mockGetCountFromServer.mockResolvedValue({
                data: () => ({ count: 42 })
            });

            const result = await loadWorkspace('user-1', 'ws-legacy');

            expect(mockGetCountFromServer).toHaveBeenCalled();
            expect(mockSetDoc).toHaveBeenCalledWith(
                expect.anything(),
                { nodeCount: 42 },
                { merge: true }
            );
            expect(result?.nodeCount).toBe(42);
        });

        it('should return null if workspace not found', async () => {
            mockGetDoc.mockResolvedValue({
                exists: () => false,
            });

            const result = await loadWorkspace('user-1', 'ws-nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('loadUserWorkspaces', () => {
        it('should return empty array when no workspaces exist', async () => {
            mockGetDocs.mockResolvedValue({ docs: [] });

            const { loadUserWorkspaces } = await import('../services/workspaceService');
            const result = await loadUserWorkspaces('user-1');

            expect(result).toEqual([]);
        });

        it('should backfill nodeCount using getCountFromServer if missing for any workspace in list', async () => {
            const mockTimestamp = { toDate: () => new Date('2024-01-01') };

            mockGetDocs.mockResolvedValue({
                docs: [
                    {
                        ref: { id: 'ref-1' },
                        data: () => ({
                            id: 'ws-legacy',
                            name: 'Legacy Workspace',
                            canvasSettings: { backgroundColor: 'grid' },
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp,
                            type: 'workspace',
                        }),
                    },
                    {
                        ref: { id: 'ref-2' },
                        data: () => ({
                            id: 'ws-new',
                            name: 'New Workspace',
                            canvasSettings: { backgroundColor: 'dots' },
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp,
                            type: 'workspace',
                            nodeCount: 10,
                        }),
                    },
                ],
            });

            mockGetCountFromServer.mockResolvedValue({
                data: () => ({ count: 5 })
            });

            const { loadUserWorkspaces } = await import('../services/workspaceService');
            const result = await loadUserWorkspaces('user-1');

            expect(result).toHaveLength(2);
            expect(result[0]!.nodeCount).toBe(5);
            expect(result[1]!.nodeCount).toBe(10);
            expect(mockGetCountFromServer).toHaveBeenCalledTimes(1);
            expect(mockSetDoc).toHaveBeenCalledWith(
                { id: 'ref-1' },
                { nodeCount: 5 },
                { merge: true }
            );
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
});
