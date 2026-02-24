/**
 * nodeShareService tests — cross-workspace sharing with masonry positioning
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CanvasNode } from '../../types/node';
import { shareNodeToWorkspace } from '../nodeShareService';
import { loadNodes, appendNode, updateWorkspaceNodeCount } from '@/features/workspace/services/workspaceService';
import { GRID_PADDING } from '../gridLayoutService';

vi.mock('@/features/workspace/services/workspaceService', () => ({
    loadNodes: vi.fn(),
    appendNode: vi.fn(),
    updateWorkspaceNodeCount: vi.fn(),
}));

const mockLoadNodes = vi.mocked(loadNodes);
const mockAppendNode = vi.mocked(appendNode);
const mockUpdateNodeCount = vi.mocked(updateWorkspaceNodeCount);

const makeNode = (overrides?: Partial<CanvasNode>): CanvasNode => ({
    id: 'idea-source',
    workspaceId: 'ws-source',
    type: 'idea',
    data: {
        heading: 'Source heading',
        output: 'Source output',
        tags: ['tag-1'],
        isGenerating: true,
        isPromptCollapsed: true,
        linkPreviews: {
            'https://example.com': { url: 'https://example.com', title: 'Ex', fetchedAt: 1000 },
        },
        calendarEvent: { id: 'ev-1', type: 'event', title: 'Test', date: '2024-01-01', status: 'synced', calendarId: 'cal-1' },
    },
    position: { x: 50, y: 50 },
    width: 280,
    height: 220,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
});

describe('shareNodeToWorkspace', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockAppendNode.mockResolvedValue(undefined);
        mockUpdateNodeCount.mockResolvedValue(undefined);
    });

    it('loads existing nodes from target workspace', async () => {
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        expect(mockLoadNodes).toHaveBeenCalledWith('user-1', 'ws-target');
    });

    it('appends a single node atomically (not full save)', async () => {
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        expect(mockAppendNode).toHaveBeenCalledWith('user-1', 'ws-target', expect.objectContaining({ type: 'idea' }));
    });

    it('updates target workspace nodeCount', async () => {
        mockLoadNodes.mockResolvedValue([makeNode()]);
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        expect(mockUpdateNodeCount).toHaveBeenCalledWith('user-1', 'ws-target', 2);
    });

    it('uses crypto.randomUUID for collision-safe ID', async () => {
        const id = await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        expect(id).toMatch(/^idea-[0-9a-f-]{36}$/);
    });

    it('deep clones data — mutating source linkPreviews does not affect shared node', async () => {
        const source = makeNode();
        await shareNodeToWorkspace('user-1', source, 'ws-target');
        source.data.linkPreviews!['https://example.com']!.title = 'Mutated';
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.data.linkPreviews?.['https://example.com']?.title).toBe('Ex');
    });

    it('preserves content and tags', async () => {
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.data.heading).toBe('Source heading');
        expect(sharedNode.data.tags).toEqual(['tag-1']);
    });

    it('excludes calendar events', async () => {
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.data.calendarEvent).toBeUndefined();
    });

    it('resets isGenerating and isPromptCollapsed', async () => {
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.data.isGenerating).toBe(false);
        expect(sharedNode.data.isPromptCollapsed).toBe(false);
    });

    it('places shared node at masonry grid padding for empty target workspace', async () => {
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.position).toEqual({ x: GRID_PADDING, y: GRID_PADDING });
    });

    it('places shared node in next masonry column when target has nodes', async () => {
        mockLoadNodes.mockResolvedValue([makeNode({ position: { x: GRID_PADDING, y: GRID_PADDING }, height: 220 })]);
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.position.y).toBe(GRID_PADDING);
        expect(sharedNode.position.x).toBeGreaterThan(GRID_PADDING);
    });

    it('returns the new node ID', async () => {
        const id = await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        expect(id).toMatch(/^idea-/);
    });

    it('handles Firestore errors gracefully by propagating', async () => {
        mockAppendNode.mockRejectedValue(new Error('Firestore write failed'));
        await expect(
            shareNodeToWorkspace('user-1', makeNode(), 'ws-target'),
        ).rejects.toThrow('Firestore write failed');
    });

    it('throws when userId is empty', async () => {
        await expect(
            shareNodeToWorkspace('', makeNode(), 'ws-target'),
        ).rejects.toThrow('Not authenticated');
        expect(mockLoadNodes).not.toHaveBeenCalled();
    });

    it('throws when targetWorkspaceId is empty', async () => {
        await expect(
            shareNodeToWorkspace('user-1', makeNode(), ''),
        ).rejects.toThrow('Invalid workspace');
        expect(mockLoadNodes).not.toHaveBeenCalled();
    });
});
