/**
 * Pinned Workspace Store Tests
 * TDD: Verifies reactive state for pinned workspaces
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { usePinnedWorkspaceStore } from '../pinnedWorkspaceStore';

// Mock workspacePinService
const mockGetPinnedIds = vi.fn().mockResolvedValue([]);
const mockPin = vi.fn().mockResolvedValue(true);
const mockUnpin = vi.fn().mockResolvedValue(true);

vi.mock('../../services/workspacePinService', () => ({
    workspacePinService: {
        getPinnedIds: () => mockGetPinnedIds(),
        pin: (...args: unknown[]) => mockPin(...args),
        unpin: (...args: unknown[]) => mockUnpin(...args),
        isPinned: vi.fn().mockResolvedValue(false),
        clear: vi.fn().mockResolvedValue(true),
    },
}));

// Mock idbCacheService
vi.mock('../../services/idbCacheService', () => ({
    idbCacheService: {
        setWorkspaceData: vi.fn().mockResolvedValue(true),
        removeWorkspaceData: vi.fn().mockResolvedValue(true),
    },
}));

// Mock workspaceCache
vi.mock('../../services/workspaceCache', () => ({
    workspaceCache: {
        get: vi.fn().mockReturnValue(null),
    },
}));

describe('pinnedWorkspaceStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store state
        usePinnedWorkspaceStore.setState({ pinnedIds: [], isLoading: false });
    });

    it('initializes with empty pinnedIds', () => {
        const state = usePinnedWorkspaceStore.getState();
        expect(state.pinnedIds).toEqual([]);
        expect(state.isLoading).toBe(false);
    });

    it('loads pinned IDs from service', async () => {
        mockGetPinnedIds.mockResolvedValue(['ws-1', 'ws-2']);

        await act(async () => {
            await usePinnedWorkspaceStore.getState().loadPinnedIds();
        });

        expect(usePinnedWorkspaceStore.getState().pinnedIds).toEqual(['ws-1', 'ws-2']);
    });

    it('pins a workspace', async () => {
        await act(async () => {
            await usePinnedWorkspaceStore.getState().pinWorkspace('ws-new');
        });

        expect(mockPin).toHaveBeenCalledWith('ws-new');
        expect(usePinnedWorkspaceStore.getState().pinnedIds).toContain('ws-new');
    });

    it('unpins a workspace', async () => {
        usePinnedWorkspaceStore.setState({ pinnedIds: ['ws-1', 'ws-2'] });

        await act(async () => {
            await usePinnedWorkspaceStore.getState().unpinWorkspace('ws-1');
        });

        expect(mockUnpin).toHaveBeenCalledWith('ws-1');
        expect(usePinnedWorkspaceStore.getState().pinnedIds).not.toContain('ws-1');
    });

    it('isPinned returns correct boolean', () => {
        usePinnedWorkspaceStore.setState({ pinnedIds: ['ws-1'] });
        expect(usePinnedWorkspaceStore.getState().isPinned('ws-1')).toBe(true);
        expect(usePinnedWorkspaceStore.getState().isPinned('ws-2')).toBe(false);
    });
});
