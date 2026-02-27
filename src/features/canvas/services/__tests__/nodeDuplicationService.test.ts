/**
 * nodeDuplicationService tests — TDD for deep clone + Firestore sanitisation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { duplicateNode } from '../nodeDuplicationService';
import type { CanvasNode } from '../../types/node';
import { GRID_GAP } from '../gridLayoutService';
import { DEFAULT_NODE_WIDTH } from '../../types/node';

const makeNode = (overrides?: Partial<CanvasNode>): CanvasNode => ({
    id: 'idea-original',
    workspaceId: 'ws-1',
    type: 'idea',
    data: {
        heading: 'Test heading',
        output: 'Some output',
        tags: ['tag-1', 'tag-2'],
        isGenerating: true,
        isPromptCollapsed: true,
        linkPreviews: {
            'https://example.com': {
                url: 'https://example.com',
                title: 'Example',
                fetchedAt: 1000,
            },
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

describe('duplicateNode', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('generates a new ID using crypto.randomUUID()', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.id).toMatch(/^idea-[0-9a-f-]{36}$/);
        expect(result.id).not.toBe('idea-original');
    });

    it('produces distinct IDs on rapid successive calls', () => {
        const source = makeNode();
        const a = duplicateNode(source, [source]);
        const b = duplicateNode(source, [source, a]);
        expect(a.id).not.toBe(b.id);
    });

    it('places duplicate to the right of the source node at the same y', () => {
        const source = makeNode({ position: { x: 100, y: 200 }, width: 280 });
        const result = duplicateNode(source, [source]);
        expect(result.position).toEqual({ x: 100 + 280 + GRID_GAP, y: 200 });
    });

    it('uses DEFAULT_NODE_WIDTH when source has no width', () => {
        const source = makeNode({ position: { x: 50, y: 80 }, width: undefined });
        const result = duplicateNode(source, [source]);
        expect(result.position).toEqual({ x: 50 + DEFAULT_NODE_WIDTH + GRID_GAP, y: 80 });
    });

    it('places duplicate beside source even when canvas is empty', () => {
        const source = makeNode({ position: { x: 32, y: 32 }, width: 280 });
        const result = duplicateNode(source, []);
        expect(result.position).toEqual({ x: 32 + 280 + GRID_GAP, y: 32 });
    });

    it('preserves heading content', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.data.heading).toBe('Test heading');
    });

    it('preserves output content', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.data.output).toBe('Some output');
    });

    it('preserves tags', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.data.tags).toEqual(['tag-1', 'tag-2']);
    });

    it('preserves linkPreviews', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.data.linkPreviews?.['https://example.com']?.title).toBe('Example');
    });

    it('deep clones linkPreviews — mutating source does not affect duplicate', () => {
        const source = makeNode();
        const result = duplicateNode(source, []);
        source.data.linkPreviews!['https://example.com']!.title = 'Mutated';
        expect(result.data.linkPreviews?.['https://example.com']?.title).toBe('Example');
    });

    it('deep clones tags — mutating source does not affect duplicate', () => {
        const source = makeNode();
        const result = duplicateNode(source, []);
        source.data.tags!.push('tag-3');
        expect(result.data.tags).toEqual(['tag-1', 'tag-2']);
    });

    it('resets isGenerating to false', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.data.isGenerating).toBe(false);
    });

    it('resets isPromptCollapsed to false', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.data.isPromptCollapsed).toBe(false);
    });

    it('excludes calendarEvent', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.data.calendarEvent).toBeUndefined();
    });

    it('preserves dimensions', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.width).toBe(280);
        expect(result.height).toBe(220);
    });

    it('removes nested undefined values recursively', () => {
        const node = makeNode({
            data: {
                heading: 'H',
                output: undefined,
                isGenerating: false,
                isPromptCollapsed: false,
            },
        } as Partial<CanvasNode>);
        const result = duplicateNode(node, []);
        expect('output' in result.data).toBe(false);
    });

    it('sets new createdAt and updatedAt timestamps', () => {
        const before = new Date();
        const result = duplicateNode(makeNode(), []);
        expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.createdAt).not.toEqual(new Date('2024-01-01'));
    });

    it('keeps the same workspaceId', () => {
        const result = duplicateNode(makeNode(), []);
        expect(result.workspaceId).toBe('ws-1');
    });
});
