/**
 * Workspace Pin Service Tests
 * TDD: Verifies pin/unpin operations and persistence
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspacePinService } from '../workspacePinService';

// Mock indexedDbService
const mockGet = vi.fn();
const mockPut = vi.fn().mockResolvedValue(true);
const mockDel = vi.fn().mockResolvedValue(true);
const mockClear = vi.fn().mockResolvedValue(true);

vi.mock('@/shared/services/indexedDbService', () => ({
    indexedDbService: {
        get: (...args: unknown[]) => mockGet(...args),
        put: (...args: unknown[]) => mockPut(...args),
        del: (...args: unknown[]) => mockDel(...args),
        clear: (...args: unknown[]) => mockClear(...args),
        getAllKeys: vi.fn().mockResolvedValue([]),
        resetConnection: vi.fn(),
    },
    IDB_STORES: {
        workspaceData: 'workspace-data',
        pinnedWorkspaces: 'pinned-workspaces',
        metadata: 'metadata',
    },
}));

describe('workspacePinService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGet.mockResolvedValue(null);
    });

    describe('getPinnedIds', () => {
        it('returns empty array when no pins exist', async () => {
            mockGet.mockResolvedValue(null);
            const ids = await workspacePinService.getPinnedIds();
            expect(ids).toEqual([]);
        });

        it('returns stored pinned IDs', async () => {
            mockGet.mockResolvedValue(['ws-1', 'ws-2']);
            const ids = await workspacePinService.getPinnedIds();
            expect(ids).toEqual(['ws-1', 'ws-2']);
        });
    });

    describe('isPinned', () => {
        it('returns true for pinned workspace', async () => {
            mockGet.mockResolvedValue(['ws-1', 'ws-2']);
            const result = await workspacePinService.isPinned('ws-1');
            expect(result).toBe(true);
        });

        it('returns false for unpinned workspace', async () => {
            mockGet.mockResolvedValue(['ws-1']);
            const result = await workspacePinService.isPinned('ws-99');
            expect(result).toBe(false);
        });
    });

    describe('pin', () => {
        it('adds workspace to pinned list', async () => {
            mockGet.mockResolvedValue([]);
            await workspacePinService.pin('ws-new');
            expect(mockPut).toHaveBeenCalled();
        });

        it('does not duplicate already pinned workspace', async () => {
            mockGet.mockResolvedValue(['ws-1']);
            const result = await workspacePinService.pin('ws-1');
            expect(result).toBe(true);
            // Should not call put for the entry since it already exists
            expect(mockPut).not.toHaveBeenCalled();
        });
    });

    describe('unpin', () => {
        it('removes workspace from pinned list', async () => {
            mockGet.mockResolvedValue(['ws-1', 'ws-2']);
            await workspacePinService.unpin('ws-1');
            expect(mockDel).toHaveBeenCalled();
        });
    });

    describe('clear', () => {
        it('clears all pinned workspaces', async () => {
            await workspacePinService.clear();
            expect(mockClear).toHaveBeenCalled();
        });
    });
});
