/**
 * buildRfNodes — Structural sharing unit tests.
 * Verifies that unchanged nodes reuse previous RF objects and that the
 * array reference is stable when nothing changes.
 */
import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { buildRfNodes, type PrevRfNodes } from '../buildRfNodes';
import { createIdeaNode } from '../../types/node';

function makeRef(): React.MutableRefObject<PrevRfNodes> {
    const ref = createRef<PrevRfNodes>() as React.MutableRefObject<PrevRfNodes>;
    ref.current = { arr: [], map: new Map() };
    return ref;
}

const emptySelection = new Set<string>();

describe('buildRfNodes structural sharing', () => {
    it('creates new RF nodes on first call', () => {
        const ref = makeRef();
        const nodes = [createIdeaNode('a', 'w1', { x: 0, y: 0 })];
        const result = buildRfNodes(nodes, emptySelection, false, ref);

        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('a');
        expect(result[0]!.data).toEqual({ id: 'a' });
    });

    it('reuses previous RF node object when source data/position/selection unchanged', () => {
        const ref = makeRef();
        const nodes = [
            createIdeaNode('a', 'w1', { x: 0, y: 0 }),
            createIdeaNode('b', 'w1', { x: 100, y: 0 }),
        ];

        const first = buildRfNodes(nodes, emptySelection, false, ref);
        const second = buildRfNodes(nodes, emptySelection, false, ref);

        expect(second).toBe(first);
        expect(second[0]).toBe(first[0]);
        expect(second[1]).toBe(first[1]);
    });

    it('returns same array reference when nothing changed', () => {
        const ref = makeRef();
        const nodes = [createIdeaNode('a', 'w1', { x: 0, y: 0 })];

        const first = buildRfNodes(nodes, emptySelection, false, ref);
        const second = buildRfNodes(nodes, emptySelection, false, ref);

        expect(second).toBe(first);
    });

    it('reuses RF node when only data content changes (decoupled from ReactFlow)', () => {
        const ref = makeRef();
        const nodeA = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const nodeB = createIdeaNode('b', 'w1', { x: 100, y: 0 });
        const nodes = [nodeA, nodeB];

        const first = buildRfNodes(nodes, emptySelection, false, ref);

        const updatedNodeA = {
            ...nodeA,
            data: { ...nodeA.data, colorKey: 'danger' as const },
            updatedAt: new Date(),
        };
        const nodesAfterColorChange = [updatedNodeA, nodeB];

        const second = buildRfNodes(nodesAfterColorChange, emptySelection, false, ref);

        // Data-only changes should NOT produce new RF nodes — IdeaCard reads from store
        expect(second).toBe(first);
        expect(second[0]).toBe(first[0]);
        expect(second[1]).toBe(first[1]);
    });

    it('creates new array but reuses unchanged nodes when selection changes', () => {
        const ref = makeRef();
        const nodes = [
            createIdeaNode('a', 'w1', { x: 0, y: 0 }),
            createIdeaNode('b', 'w1', { x: 100, y: 0 }),
        ];

        const first = buildRfNodes(nodes, emptySelection, false, ref);
        const withSelection = buildRfNodes(nodes, new Set(['a']), false, ref);

        expect(withSelection).not.toBe(first);
        expect(withSelection[0]).not.toBe(first[0]);
        expect(withSelection[0]!.selected).toBe(true);
        expect(withSelection[1]).toBe(first[1]);
    });

    it('creates new RF node when position changes', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });

        const first = buildRfNodes([node], emptySelection, false, ref);
        const moved = { ...node, position: { x: 50, y: 50 } };
        const second = buildRfNodes([moved], emptySelection, false, ref);

        expect(second[0]).not.toBe(first[0]);
        expect(second[0]!.position).toEqual({ x: 50, y: 50 });
    });

    it('handles node additions correctly', () => {
        const ref = makeRef();
        const nodeA = createIdeaNode('a', 'w1', { x: 0, y: 0 });

        const first = buildRfNodes([nodeA], emptySelection, false, ref);
        const nodeB = createIdeaNode('b', 'w1', { x: 100, y: 0 });
        const second = buildRfNodes([nodeA, nodeB], emptySelection, false, ref);

        expect(second).not.toBe(first);
        expect(second[0]).toBe(first[0]);
        expect(second).toHaveLength(2);
    });

    it('handles node removals correctly', () => {
        const ref = makeRef();
        const nodeA = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const nodeB = createIdeaNode('b', 'w1', { x: 100, y: 0 });

        const first = buildRfNodes([nodeA, nodeB], emptySelection, false, ref);
        const second = buildRfNodes([nodeB], emptySelection, false, ref);

        expect(second).not.toBe(first);
        expect(second[0]).toBe(first[1]);
    });

    it('updates draggable when isInteractionDisabled changes', () => {
        const ref = makeRef();
        const nodes = [createIdeaNode('a', 'w1', { x: 0, y: 0 })];

        const first = buildRfNodes(nodes, emptySelection, false, ref);
        expect(first[0]!.draggable).toBe(true);

        const second = buildRfNodes(nodes, emptySelection, true, ref);
        expect(second[0]!.draggable).toBe(false);
        expect(second[0]).not.toBe(first[0]);
    });

    it('returns an empty array for empty nodes input', () => {
        const ref = makeRef();
        const result = buildRfNodes([], emptySelection, false, ref);
        expect(result).toHaveLength(0);
    });

    it('sets draggable=false when node isPinned', () => {
        const ref = makeRef();
        const pinned = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        pinned.data = { ...pinned.data, isPinned: true };
        const result = buildRfNodes([pinned], emptySelection, false, ref);
        expect(result[0]!.draggable).toBe(false);
    });

    it('omits width/height when they are undefined', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        delete (node as unknown as Record<string, unknown>).width;
        delete (node as unknown as Record<string, unknown>).height;
        const result = buildRfNodes([node], emptySelection, false, ref);
        expect(result[0]!).not.toHaveProperty('width');
        expect(result[0]!).not.toHaveProperty('height');
    });

    it('includes width/height when they are set to 0', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        node.width = 0;
        node.height = 0;
        const result = buildRfNodes([node], emptySelection, false, ref);
        expect(result[0]!.width).toBe(0);
        expect(result[0]!.height).toBe(0);
    });
});

describe('buildRfNodes — render loop prevention (regression)', () => {
    it('data shell is a stable reference across calls for the same node id', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });

        const first = buildRfNodes([node], emptySelection, false, ref);
        const moved = { ...node, position: { x: 99, y: 99 } };
        const second = buildRfNodes([moved], emptySelection, false, ref);

        expect(first[0]!.data).toBe(second[0]!.data);
    });

    it('data shell never contains content fields (only id)', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        node.data = { ...node.data, output: 'long content', heading: 'title', colorKey: 'danger' };

        const result = buildRfNodes([node], emptySelection, false, ref);
        expect(Object.keys(result[0]!.data as Record<string, unknown>)).toEqual(['id']);
    });

    it('is immune to output/heading/tag/color mutations — array stays stable', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const first = buildRfNodes([node], emptySelection, false, ref);

        const mutations = [
            { ...node, data: { ...node.data, output: 'changed' } },
            { ...node, data: { ...node.data, heading: 'new heading' } },
            { ...node, data: { ...node.data, tags: ['tag-1'] } },
            { ...node, data: { ...node.data, colorKey: 'warning' as const } },
            { ...node, data: { ...node.data, isGenerating: true } },
            { ...node, data: { ...node.data, isCollapsed: true } },
        ];

        for (const mutated of mutations) {
            const result = buildRfNodes([mutated], emptySelection, false, ref);
            expect(result).toBe(first);
        }
    });

    it('updates draggable when isPinned toggles (structural change)', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const first = buildRfNodes([node], emptySelection, false, ref);
        expect(first[0]!.draggable).toBe(true);

        const pinned = { ...node, data: { ...node.data, isPinned: true } };
        const second = buildRfNodes([pinned], emptySelection, false, ref);
        expect(second[0]!.draggable).toBe(false);
        expect(second[0]).not.toBe(first[0]);
    });
});
