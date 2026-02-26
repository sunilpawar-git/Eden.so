/**
 * Shared test fixtures for FocusOverlay tests.
 */
import type { CanvasNode } from '../../../types/node';
import { useCanvasStore } from '../../../stores/canvasStore';

export const mockNode: CanvasNode = {
    id: 'node-1',
    workspaceId: 'workspace-1',
    type: 'idea',
    data: {
        heading: 'Test Heading',
        prompt: 'Test prompt',
        output: 'Test output content',
        isGenerating: false,
        isPromptCollapsed: false,
        tags: ['tag-1', 'tag-2'],
        linkPreviews: {
            'https://x.com/post/123': {
                url: 'https://x.com/post/123',
                title: 'X Post',
                domain: 'x.com',
                fetchedAt: 1704067200000,
            },
        },
    },
    position: { x: 100, y: 200 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
};

export const mockNodeNoTags: CanvasNode = {
    ...mockNode,
    id: 'node-no-tags',
    data: { ...mockNode.data, tags: [], heading: '', linkPreviews: undefined },
};

export const mockNodeDanger: CanvasNode = {
    ...mockNode,
    id: 'node-danger',
    data: { ...mockNode.data, colorKey: 'danger' },
};

export const mockNodeWarning: CanvasNode = {
    ...mockNode,
    id: 'node-warning',
    data: { ...mockNode.data, colorKey: 'warning' },
};

export const mockNodeSuccess: CanvasNode = {
    ...mockNode,
    id: 'node-success',
    data: { ...mockNode.data, colorKey: 'success' },
};

export const mockNodeLegacy: CanvasNode = {
    ...mockNode,
    id: 'node-legacy',
    // 'primary' is not a valid NodeColorKey — tests graceful fallback for legacy data
    data: { ...mockNode.data, colorKey: 'primary' as never },
};

export const ALL_MOCK_NODES = [
    mockNode, mockNodeNoTags, mockNodeDanger, mockNodeWarning, mockNodeSuccess, mockNodeLegacy,
];

export function setCanvasDefaults(): void {
    useCanvasStore.setState({
        nodes: ALL_MOCK_NODES,
        edges: [],
        selectedNodeIds: new Set(),
        editingNodeId: null,
        draftContent: null,
        inputMode: 'note',
    });
}
