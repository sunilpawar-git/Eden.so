/**
 * nodeCloneUtils tests — shared deep-clone logic for duplicate and share
 */
import { describe, it, expect } from 'vitest';
import { buildClonedNode } from '../nodeCloneUtils';
import type { CanvasNode } from '../../types/node';

const makeNode = (overrides?: Partial<CanvasNode>): CanvasNode => ({
    id: 'idea-source',
    workspaceId: 'ws-1',
    type: 'idea',
    data: {
        heading: 'Heading',
        output: 'Output',
        tags: ['tag-1'],
        isGenerating: true,
        isPromptCollapsed: true,
        linkPreviews: {
            'https://example.com': { url: 'https://example.com', title: 'Ex', fetchedAt: 1000 },
        },
        calendarEvent: { id: 'ev-1', type: 'event', title: 'T', date: '2024-01-01', status: 'synced', calendarId: 'cal-1' },
    },
    position: { x: 50, y: 50 },
    width: 280,
    height: 220,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
});

describe('buildClonedNode', () => {
    it('assigns a new collision-safe UUID', () => {
        const clone = buildClonedNode(makeNode(), { position: { x: 0, y: 0 } });
        expect(clone.id).toMatch(/^idea-[0-9a-f-]{36}$/);
        expect(clone.id).not.toBe('idea-source');
    });

    it('uses overridden workspaceId when provided', () => {
        const clone = buildClonedNode(makeNode(), { workspaceId: 'ws-other', position: { x: 0, y: 0 } });
        expect(clone.workspaceId).toBe('ws-other');
    });

    it('defaults to source workspaceId when not overridden', () => {
        const clone = buildClonedNode(makeNode(), { position: { x: 0, y: 0 } });
        expect(clone.workspaceId).toBe('ws-1');
    });

    it('uses the provided position', () => {
        const clone = buildClonedNode(makeNode(), { position: { x: 123, y: 456 } });
        expect(clone.position).toEqual({ x: 123, y: 456 });
    });

    it('resets isGenerating and isPromptCollapsed', () => {
        const clone = buildClonedNode(makeNode(), { position: { x: 0, y: 0 } });
        expect(clone.data.isGenerating).toBe(false);
        expect(clone.data.isPromptCollapsed).toBe(false);
    });

    it('strips calendarEvent', () => {
        const clone = buildClonedNode(makeNode(), { position: { x: 0, y: 0 } });
        expect(clone.data.calendarEvent).toBeUndefined();
    });

    it('deep clones data — source mutation does not affect clone', () => {
        const source = makeNode();
        const clone = buildClonedNode(source, { position: { x: 0, y: 0 } });
        source.data.tags!.push('tag-2');
        source.data.linkPreviews!['https://example.com']!.title = 'Mutated';
        expect(clone.data.tags).toEqual(['tag-1']);
        expect(clone.data.linkPreviews?.['https://example.com']?.title).toBe('Ex');
    });

    it('strips nested undefined values for Firestore', () => {
        const source = makeNode({
            data: { heading: 'H', output: undefined, isGenerating: false, isPromptCollapsed: false },
        } as Partial<CanvasNode>);
        const clone = buildClonedNode(source, { position: { x: 0, y: 0 } });
        expect('output' in clone.data).toBe(false);
    });

    it('preserves width and height', () => {
        const clone = buildClonedNode(makeNode(), { position: { x: 0, y: 0 } });
        expect(clone.width).toBe(280);
        expect(clone.height).toBe(220);
    });

    it('sets fresh createdAt and updatedAt timestamps', () => {
        const before = new Date();
        const clone = buildClonedNode(makeNode(), { position: { x: 0, y: 0 } });
        expect(clone.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(clone.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
});
