/**
 * Workspace Service Tests - TDD: Write tests FIRST
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    saveWorkspace,
    loadWorkspace,
} from '../services/workspaceService';

// Mock Firestore
vi.mock('@/config/firebase', () => ({
    db: {},
}));

// Mock Firestore functions
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(() => ({ id: 'mock-ref' })),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
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
});
