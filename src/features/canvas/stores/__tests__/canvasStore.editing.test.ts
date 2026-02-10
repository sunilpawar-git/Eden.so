/**
 * Canvas Store Editing State Tests
 * TDD: Validates editing SSOT, draft management, and link preview actions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../canvasStore';
import type { CanvasNode, LinkPreviewMetadata } from '../../types/node';

const createMockNode = (id: string, overrides?: Partial<CanvasNode>): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    data: { prompt: '', output: '', tags: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const mockPreview: LinkPreviewMetadata = {
    url: 'https://example.com',
    title: 'Example',
    description: 'An example website',
    image: 'https://example.com/og.png',
    favicon: 'https://example.com/favicon.ico',
    domain: 'example.com',
    fetchedAt: Date.now(),
};

describe('canvasStore editing state', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    describe('initial state', () => {
        it('starts with editingNodeId as null', () => {
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('starts with draftContent as null', () => {
            expect(useCanvasStore.getState().draftContent).toBeNull();
        });

        it('starts with inputMode as note', () => {
            expect(useCanvasStore.getState().inputMode).toBe('note');
        });
    });

    describe('startEditing', () => {
        it('sets editingNodeId to the given node', () => {
            useCanvasStore.getState().startEditing('node-1');
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        });

        it('resets draftContent to null on start', () => {
            useCanvasStore.getState().updateDraft('old draft');
            useCanvasStore.getState().startEditing('node-1');
            expect(useCanvasStore.getState().draftContent).toBeNull();
        });

        it('resets inputMode to note on start', () => {
            useCanvasStore.getState().setInputMode('ai');
            useCanvasStore.getState().startEditing('node-1');
            expect(useCanvasStore.getState().inputMode).toBe('note');
        });

        it('auto-stops previous node when starting edit on another (single-editor invariant)', () => {
            useCanvasStore.getState().startEditing('node-A');
            useCanvasStore.getState().updateDraft('draft-A');

            useCanvasStore.getState().startEditing('node-B');

            expect(useCanvasStore.getState().editingNodeId).toBe('node-B');
            expect(useCanvasStore.getState().draftContent).toBeNull();
        });
    });

    describe('stopEditing', () => {
        it('nulls editingNodeId', () => {
            useCanvasStore.getState().startEditing('node-1');
            useCanvasStore.getState().stopEditing();
            expect(useCanvasStore.getState().editingNodeId).toBeNull();
        });

        it('nulls draftContent', () => {
            useCanvasStore.getState().startEditing('node-1');
            useCanvasStore.getState().updateDraft('some content');
            useCanvasStore.getState().stopEditing();
            expect(useCanvasStore.getState().draftContent).toBeNull();
        });

        it('resets inputMode to note', () => {
            useCanvasStore.getState().setInputMode('ai');
            useCanvasStore.getState().stopEditing();
            expect(useCanvasStore.getState().inputMode).toBe('note');
        });
    });

    describe('updateDraft', () => {
        it('writes draftContent', () => {
            useCanvasStore.getState().updateDraft('hello world');
            expect(useCanvasStore.getState().draftContent).toBe('hello world');
        });

        it('overwrites previous draftContent', () => {
            useCanvasStore.getState().updateDraft('first');
            useCanvasStore.getState().updateDraft('second');
            expect(useCanvasStore.getState().draftContent).toBe('second');
        });
    });

    describe('setInputMode', () => {
        it('sets inputMode to ai', () => {
            useCanvasStore.getState().setInputMode('ai');
            expect(useCanvasStore.getState().inputMode).toBe('ai');
        });

        it('sets inputMode to note', () => {
            useCanvasStore.getState().setInputMode('ai');
            useCanvasStore.getState().setInputMode('note');
            expect(useCanvasStore.getState().inputMode).toBe('note');
        });
    });

    describe('deleteNode clears editing state', () => {
        it('stops editing when the editing node is deleted', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));
            useCanvasStore.getState().startEditing('node-1');
            useCanvasStore.getState().updateDraft('in-progress draft');

            useCanvasStore.getState().deleteNode('node-1');

            expect(useCanvasStore.getState().editingNodeId).toBeNull();
            expect(useCanvasStore.getState().draftContent).toBeNull();
            expect(useCanvasStore.getState().inputMode).toBe('note');
        });

        it('preserves editing state when a different node is deleted', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));
            useCanvasStore.getState().addNode(createMockNode('node-2'));
            useCanvasStore.getState().startEditing('node-1');
            useCanvasStore.getState().updateDraft('my draft');

            useCanvasStore.getState().deleteNode('node-2');

            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
            expect(useCanvasStore.getState().draftContent).toBe('my draft');
        });
    });

    describe('clearCanvas resets editing state', () => {
        it('clears editing state on clearCanvas', () => {
            useCanvasStore.getState().startEditing('node-1');
            useCanvasStore.getState().updateDraft('draft');
            useCanvasStore.getState().setInputMode('ai');

            useCanvasStore.getState().clearCanvas();

            expect(useCanvasStore.getState().editingNodeId).toBeNull();
            expect(useCanvasStore.getState().draftContent).toBeNull();
            expect(useCanvasStore.getState().inputMode).toBe('note');
        });
    });
});

describe('canvasStore link preview actions', () => {
    beforeEach(() => {
        useCanvasStore.getState().clearCanvas();
    });

    describe('addLinkPreview', () => {
        it('stores metadata keyed by URL on the target node', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));

            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, mockPreview);

            const node = useCanvasStore.getState().nodes[0]!;
            expect(node.data.linkPreviews).toBeDefined();
            expect(node.data.linkPreviews![mockPreview.url]).toEqual(mockPreview);
        });

        it('adds multiple link previews to the same node', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));
            const twitterPreview: LinkPreviewMetadata = {
                ...mockPreview,
                url: 'https://x.com/user/status/123',
                title: 'A Tweet',
                domain: 'x.com',
                cardType: 'summary_large_image',
            };

            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, mockPreview);
            useCanvasStore.getState().addLinkPreview('node-1', twitterPreview.url, twitterPreview);

            const previews = useCanvasStore.getState().nodes[0]!.data.linkPreviews!;
            expect(Object.keys(previews)).toHaveLength(2);
            expect(previews[mockPreview.url]!.title).toBe('Example');
            expect(previews[twitterPreview.url]!.title).toBe('A Tweet');
        });

        it('overwrites existing preview for the same URL (refresh)', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));

            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, mockPreview);
            const updated = { ...mockPreview, title: 'Updated Title', fetchedAt: Date.now() + 1000 };
            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, updated);

            const preview = useCanvasStore.getState().nodes[0]!.data.linkPreviews![mockPreview.url]!;
            expect(preview.title).toBe('Updated Title');
        });

        it('updates updatedAt timestamp on the node', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));
            const before = useCanvasStore.getState().nodes[0]!.updatedAt;

            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, mockPreview);
            const after = useCanvasStore.getState().nodes[0]!.updatedAt;

            expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });

        it('does not affect other nodes', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));
            useCanvasStore.getState().addNode(createMockNode('node-2'));

            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, mockPreview);

            const node2 = useCanvasStore.getState().nodes[1]!;
            expect(node2.data.linkPreviews).toBeUndefined();
        });
    });

    describe('removeLinkPreview', () => {
        it('removes a link preview by URL', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));
            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, mockPreview);

            useCanvasStore.getState().removeLinkPreview('node-1', mockPreview.url);

            const previews = useCanvasStore.getState().nodes[0]!.data.linkPreviews!;
            expect(previews[mockPreview.url]).toBeUndefined();
        });

        it('preserves other link previews when removing one', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));
            const secondUrl = 'https://other.com';
            const secondPreview: LinkPreviewMetadata = {
                ...mockPreview, url: secondUrl, domain: 'other.com',
            };

            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, mockPreview);
            useCanvasStore.getState().addLinkPreview('node-1', secondUrl, secondPreview);
            useCanvasStore.getState().removeLinkPreview('node-1', mockPreview.url);

            const previews = useCanvasStore.getState().nodes[0]!.data.linkPreviews!;
            expect(previews[secondUrl]).toBeDefined();
            expect(Object.keys(previews)).toHaveLength(1);
        });

        it('updates updatedAt timestamp on the node', () => {
            useCanvasStore.getState().addNode(createMockNode('node-1'));
            useCanvasStore.getState().addLinkPreview('node-1', mockPreview.url, mockPreview);
            const before = useCanvasStore.getState().nodes[0]!.updatedAt;

            useCanvasStore.getState().removeLinkPreview('node-1', mockPreview.url);
            const after = useCanvasStore.getState().nodes[0]!.updatedAt;

            expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });
    });
});
