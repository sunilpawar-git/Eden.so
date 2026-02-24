/**
 * Duplicate & Share integration tests — end-to-end flows for node duplication and sharing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import { duplicateNode } from '../services/nodeDuplicationService';
import { shareNodeToWorkspace, computeSharePosition } from '../services/nodeShareService';
import type { CanvasNode } from '../types/node';
import { loadNodes, appendNode, updateWorkspaceNodeCount } from '@/features/workspace/services/workspaceService';

vi.mock('@/features/workspace/services/workspaceService', () => ({
    loadNodes: vi.fn(),
    appendNode: vi.fn(),
    updateWorkspaceNodeCount: vi.fn(),
}));

const mockLoadNodes = vi.mocked(loadNodes);
const mockAppendNode = vi.mocked(appendNode);
const mockUpdateNodeCount = vi.mocked(updateWorkspaceNodeCount);

const makeNode = (overrides?: Partial<CanvasNode>): CanvasNode => ({
    id: 'idea-1',
    workspaceId: 'ws-1',
    type: 'idea',
    data: {
        heading: 'Test heading',
        output: 'Test output',
        tags: ['tag-1', 'tag-2'],
        isGenerating: true,
        isPromptCollapsed: true,
        linkPreviews: {
            'https://example.com': { url: 'https://example.com', title: 'Ex', fetchedAt: 1000 },
        },
        calendarEvent: { id: 'ev-1', type: 'event', title: 'Test', date: '2024-01-01', status: 'synced', calendarId: 'cal-1' },
    },
    position: { x: 100, y: 200 },
    width: 280,
    height: 220,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
});

describe('Duplicate Flow', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [makeNode()], edges: [], selectedNodeIds: new Set() });
    });

    it('places duplicate at next masonry grid slot (not overlapping source)', () => {
        const result = useCanvasStore.getState().duplicateNode('idea-1');
        expect(result).toBeDefined();
        const nodes = useCanvasStore.getState().nodes;
        expect(nodes).toHaveLength(2);
        const source = nodes.find((n) => n.id === 'idea-1');
        const dup = nodes.find((n) => n.id === result);
        const overlapsX = dup!.position.x === source!.position.x;
        const overlapsY = Math.abs(dup!.position.y - source!.position.y) < (source!.height ?? 220);
        expect(overlapsX && overlapsY).toBe(false);
    });

    it('preserves and deep clones link previews', () => {
        const result = useCanvasStore.getState().duplicateNode('idea-1');
        const dup = useCanvasStore.getState().nodes.find((n) => n.id === result);
        expect(dup?.data.linkPreviews?.['https://example.com']?.title).toBe('Ex');

        const original = useCanvasStore.getState().nodes.find((n) => n.id === 'idea-1');
        original!.data.linkPreviews!['https://example.com']!.title = 'Mutated';
        expect(dup?.data.linkPreviews?.['https://example.com']?.title).toBe('Ex');
    });

    it('excludes calendar events from duplicate', () => {
        const result = useCanvasStore.getState().duplicateNode('idea-1');
        const dup = useCanvasStore.getState().nodes.find((n) => n.id === result);
        expect(dup?.data.calendarEvent).toBeUndefined();
    });

    it('produces unique IDs on rapid successive duplicates', () => {
        const id1 = useCanvasStore.getState().duplicateNode('idea-1');
        const id2 = useCanvasStore.getState().duplicateNode('idea-1');
        expect(id1).not.toBe(id2);
        expect(useCanvasStore.getState().nodes).toHaveLength(3);
    });
});

describe('Share Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadNodes.mockResolvedValue([]);
        mockAppendNode.mockResolvedValue(undefined);
        mockUpdateNodeCount.mockResolvedValue(undefined);
    });

    it('shares node to target workspace via atomic append', async () => {
        const id = await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        expect(id).toMatch(/^idea-/);
        expect(mockAppendNode).toHaveBeenCalledWith('user-1', 'ws-target', expect.objectContaining({ type: 'idea' }));
    });

    it('positions at smart offset from existing nodes', async () => {
        mockLoadNodes.mockResolvedValue([makeNode({ position: { x: 200, y: 300 } })]);
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.position).toEqual({ x: 280, y: 380 });
    });

    it('falls back to (100, 100) for empty target workspace', async () => {
        await shareNodeToWorkspace('user-1', makeNode(), 'ws-target');
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.position).toEqual({ x: 100, y: 100 });
    });

    it('rejects when userId is empty', async () => {
        await expect(shareNodeToWorkspace('', makeNode(), 'ws-target')).rejects.toThrow('Not authenticated');
        expect(mockLoadNodes).not.toHaveBeenCalled();
    });
});

describe('Data Integrity Edge Cases', () => {
    it('duplicate strips nested undefined values', () => {
        const node = makeNode({
            data: { heading: 'H', output: undefined, isGenerating: false, isPromptCollapsed: false },
        } as Partial<CanvasNode>);
        const result = duplicateNode(node, []);
        expect('output' in result.data).toBe(false);
    });

    it('share preserves and deep clones link previews', async () => {
        mockLoadNodes.mockResolvedValue([]);
        mockAppendNode.mockResolvedValue(undefined);
        mockUpdateNodeCount.mockResolvedValue(undefined);
        const source = makeNode();
        await shareNodeToWorkspace('user-1', source, 'ws-target');
        source.data.linkPreviews!['https://example.com']!.title = 'Mutated';
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.data.linkPreviews?.['https://example.com']?.title).toBe('Ex');
    });

    it('smart positioning handles single-node workspace', () => {
        expect(computeSharePosition([makeNode({ position: { x: 50, y: 50 } })])).toEqual({ x: 130, y: 130 });
    });

    it('smart positioning handles empty workspace', () => {
        expect(computeSharePosition([])).toEqual({ x: 100, y: 100 });
    });
});

describe('Mutation Isolation', () => {
    it('mutating source tags after duplicate does not affect the copy', () => {
        const source = makeNode();
        const result = duplicateNode(source, []);
        source.data.tags!.push('tag-3');
        expect(result.data.tags).toEqual(['tag-1', 'tag-2']);
    });

    it('mutating source linkPreviews after share does not affect the shared copy', async () => {
        mockLoadNodes.mockResolvedValue([]);
        mockAppendNode.mockResolvedValue(undefined);
        mockUpdateNodeCount.mockResolvedValue(undefined);
        const source = makeNode();
        await shareNodeToWorkspace('user-1', source, 'ws-target');
        source.data.linkPreviews!['https://example.com']!.title = 'Changed';
        const sharedNode = mockAppendNode.mock.calls[0]?.[2] as CanvasNode;
        expect(sharedNode.data.linkPreviews?.['https://example.com']?.title).toBe('Ex');
    });
});
