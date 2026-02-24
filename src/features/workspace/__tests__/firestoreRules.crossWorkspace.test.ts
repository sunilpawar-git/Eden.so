/**
 * Firestore rules cross-workspace validation tests (mocked).
 * Validates application-layer auth guards and correct document paths.
 * True emulator-backed tests deferred as future infrastructure enhancement.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CanvasNode } from '@/features/canvas/types/node';
import { loadNodes, appendNode, updateWorkspaceNodeCount } from '@/features/workspace/services/workspaceService';
import { shareNodeToWorkspace } from '@/features/canvas/services/nodeShareService';

vi.mock('@/features/workspace/services/workspaceService', () => ({
    loadNodes: vi.fn().mockResolvedValue([]),
    appendNode: vi.fn().mockResolvedValue(undefined),
    updateWorkspaceNodeCount: vi.fn().mockResolvedValue(undefined),
}));

const mockLoadNodes = vi.mocked(loadNodes);
const mockAppendNode = vi.mocked(appendNode);
const mockUpdateNodeCount = vi.mocked(updateWorkspaceNodeCount);

const makeNode = (workspaceId = 'ws-a'): CanvasNode => ({
    id: 'idea-src',
    workspaceId,
    type: 'idea',
    data: { heading: 'H', output: 'O', isGenerating: false, isPromptCollapsed: false },
    position: { x: 0, y: 0 },
    width: 280,
    height: 220,
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('Firestore rules — cross-workspace security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockAppendNode.mockResolvedValue(undefined);
        mockUpdateNodeCount.mockResolvedValue(undefined);
    });

    it('user writes to own workspace A (succeeds)', async () => {
        const id = await shareNodeToWorkspace('user-1', makeNode('ws-a'), 'ws-a');
        expect(id).toMatch(/^idea-/);
        expect(mockAppendNode).toHaveBeenCalledWith('user-1', 'ws-a', expect.objectContaining({ type: 'idea' }));
    });

    it('user writes to own workspace B (cross-workspace, succeeds)', async () => {
        const id = await shareNodeToWorkspace('user-1', makeNode('ws-a'), 'ws-b');
        expect(id).toMatch(/^idea-/);
        expect(mockAppendNode).toHaveBeenCalledWith('user-1', 'ws-b', expect.objectContaining({ type: 'idea' }));
    });

    it('unauthenticated user (no userId) rejected before Firestore call', async () => {
        await expect(shareNodeToWorkspace('', makeNode(), 'ws-b')).rejects.toThrow('Not authenticated');
        expect(mockLoadNodes).not.toHaveBeenCalled();
        expect(mockAppendNode).not.toHaveBeenCalled();
    });

    it('share service targets correct workspace in Firestore', async () => {
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-target');
        expect(mockAppendNode).toHaveBeenCalledWith('user-1', 'ws-target', expect.any(Object));
        expect(mockUpdateNodeCount).toHaveBeenCalledWith('user-1', 'ws-target', 1);
    });

    it('sequential shares to different workspaces succeed', async () => {
        await shareNodeToWorkspace('user-1', makeNode('ws-a'), 'ws-b');
        await shareNodeToWorkspace('user-1', makeNode('ws-a'), 'ws-c');
        expect(mockAppendNode).toHaveBeenCalledTimes(2);
        expect(mockAppendNode).toHaveBeenCalledWith('user-1', 'ws-b', expect.any(Object));
        expect(mockAppendNode).toHaveBeenCalledWith('user-1', 'ws-c', expect.any(Object));
    });

    it('Firestore error propagates to caller', async () => {
        mockAppendNode.mockRejectedValue(new Error('PERMISSION_DENIED'));
        await expect(
            shareNodeToWorkspace('user-1', makeNode(), 'ws-target'),
        ).rejects.toThrow('PERMISSION_DENIED');
    });
});
