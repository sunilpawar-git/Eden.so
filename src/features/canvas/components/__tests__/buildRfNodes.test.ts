/**
 * buildRfNodes — Structural sharing unit tests.
 * Verifies that unchanged nodes reuse previous RF objects and that the
 * array reference is stable when nothing changes.
 */
import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { buildRfNodes, cleanupDataShells, type PrevRfNodes } from '../buildRfNodes';
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
        const result = buildRfNodes(nodes, emptySelection, ref);

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

        const first = buildRfNodes(nodes, emptySelection, ref);
        const second = buildRfNodes(nodes, emptySelection, ref);

        expect(second).toBe(first);
        expect(second[0]).toBe(first[0]);
        expect(second[1]).toBe(first[1]);
    });

    it('returns same array reference when nothing changed', () => {
        const ref = makeRef();
        const nodes = [createIdeaNode('a', 'w1', { x: 0, y: 0 })];

        const first = buildRfNodes(nodes, emptySelection, ref);
        const second = buildRfNodes(nodes, emptySelection, ref);

        expect(second).toBe(first);
    });

    it('reuses RF node when only data content changes (decoupled from ReactFlow)', () => {
        const ref = makeRef();
        const nodeA = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const nodeB = createIdeaNode('b', 'w1', { x: 100, y: 0 });
        const nodes = [nodeA, nodeB];

        const first = buildRfNodes(nodes, emptySelection, ref);

        const updatedNodeA = {
            ...nodeA,
            data: { ...nodeA.data, colorKey: 'danger' as const },
            updatedAt: new Date(),
        };
        const nodesAfterColorChange = [updatedNodeA, nodeB];

        const second = buildRfNodes(nodesAfterColorChange, emptySelection, ref);

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

        const first = buildRfNodes(nodes, emptySelection, ref);
        const withSelection = buildRfNodes(nodes, new Set(['a']), ref);

        expect(withSelection).not.toBe(first);
        expect(withSelection[0]).not.toBe(first[0]);
        expect(withSelection[0]!.selected).toBe(true);
        expect(withSelection[1]).toBe(first[1]);
    });

    it('creates new RF node when position changes', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });

        const first = buildRfNodes([node], emptySelection, ref);
        const moved = { ...node, position: { x: 50, y: 50 } };
        const second = buildRfNodes([moved], emptySelection, ref);

        expect(second[0]).not.toBe(first[0]);
        expect(second[0]!.position).toEqual({ x: 50, y: 50 });
    });

    it('handles node additions correctly', () => {
        const ref = makeRef();
        const nodeA = createIdeaNode('a', 'w1', { x: 0, y: 0 });

        const first = buildRfNodes([nodeA], emptySelection, ref);
        const nodeB = createIdeaNode('b', 'w1', { x: 100, y: 0 });
        const second = buildRfNodes([nodeA, nodeB], emptySelection, ref);

        expect(second).not.toBe(first);
        expect(second[0]).toBe(first[0]);
        expect(second).toHaveLength(2);
    });

    it('handles node removals correctly', () => {
        const ref = makeRef();
        const nodeA = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const nodeB = createIdeaNode('b', 'w1', { x: 100, y: 0 });

        const first = buildRfNodes([nodeA, nodeB], emptySelection, ref);
        const second = buildRfNodes([nodeB], emptySelection, ref);

        expect(second).not.toBe(first);
        expect(second[0]).toBe(first[1]);
    });

    it('is NOT affected by focus/lock transitions (no isInteractionDisabled param)', () => {
        const ref = makeRef();
        const nodes = [
            createIdeaNode('a', 'w1', { x: 0, y: 0 }),
            createIdeaNode('b', 'w1', { x: 100, y: 0 }),
        ];

        const first = buildRfNodes(nodes, emptySelection, ref);
        const second = buildRfNodes(nodes, emptySelection, ref);

        expect(second).toBe(first);
    });

    it('returns an empty array for empty nodes input', () => {
        const ref = makeRef();
        const result = buildRfNodes([], emptySelection, ref);
        expect(result).toHaveLength(0);
    });

    it('does NOT include draggable in RF node objects', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const result = buildRfNodes([node], emptySelection, ref);
        expect(result[0]).not.toHaveProperty('draggable');
    });

    it('returns same array ref when only isPinned changes', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const first = buildRfNodes([node], emptySelection, ref);

        const pinned = { ...node, data: { ...node.data, isPinned: true } };
        const second = buildRfNodes([pinned], emptySelection, ref);
        expect(second).toBe(first);
    });

    it('omits width/height when they are undefined', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        delete (node as unknown as Record<string, unknown>).width;
        delete (node as unknown as Record<string, unknown>).height;
        const result = buildRfNodes([node], emptySelection, ref);
        expect(result[0]!).not.toHaveProperty('width');
        expect(result[0]!).not.toHaveProperty('height');
    });

    it('includes width/height when they are set to 0', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        node.width = 0;
        node.height = 0;
        const result = buildRfNodes([node], emptySelection, ref);
        expect(result[0]!.width).toBe(0);
        expect(result[0]!.height).toBe(0);
    });
});

describe('buildRfNodes — render loop prevention (regression)', () => {
    it('data shell is a stable reference across calls for the same node id', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });

        const first = buildRfNodes([node], emptySelection, ref);
        const moved = { ...node, position: { x: 99, y: 99 } };
        const second = buildRfNodes([moved], emptySelection, ref);

        expect(first[0]!.data).toBe(second[0]!.data);
    });

    it('data shell never contains content fields (only id)', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        node.data = { ...node.data, output: 'long content', heading: 'title', colorKey: 'danger' };

        const result = buildRfNodes([node], emptySelection, ref);
        expect(Object.keys(result[0]!.data as Record<string, unknown>)).toEqual(['id']);
    });

    it('is immune to output/heading/tag/color mutations — array stays stable', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const first = buildRfNodes([node], emptySelection, ref);

        const mutations = [
            { ...node, data: { ...node.data, output: 'changed' } },
            { ...node, data: { ...node.data, heading: 'new heading' } },
            { ...node, data: { ...node.data, tags: ['tag-1'] } },
            { ...node, data: { ...node.data, colorKey: 'warning' as const } },
            { ...node, data: { ...node.data, isGenerating: true } },
            { ...node, data: { ...node.data, isCollapsed: true } },
        ];

        for (const mutated of mutations) {
            const result = buildRfNodes([mutated], emptySelection, ref);
            expect(result).toBe(first);
        }
    });

    it('isPinned toggle does NOT produce new RF node objects (handled by noDragClassName)', () => {
        const ref = makeRef();
        const node = createIdeaNode('a', 'w1', { x: 0, y: 0 });
        const first = buildRfNodes([node], emptySelection, ref);

        const pinned = { ...node, data: { ...node.data, isPinned: true } };
        const second = buildRfNodes([pinned], emptySelection, ref);
        expect(second).toBe(first);
        expect(second[0]).toBe(first[0]);
    });
});

describe('cleanupDataShells', () => {
    it('removes data shells for nodes no longer in activeIds', () => {
        const ref = makeRef();
        const nodes = [
            createIdeaNode('x', 'w1', { x: 0, y: 0 }),
            createIdeaNode('y', 'w1', { x: 50, y: 50 }),
        ];
        const first = buildRfNodes(nodes, emptySelection, ref);
        expect(first).toHaveLength(2);

        cleanupDataShells(new Set(['x']));

        const moved = { ...nodes[1]!, position: { x: 99, y: 99 } };
        const second = buildRfNodes([nodes[0]!, moved], emptySelection, ref);
        expect(second[0]!.data).toBe(first[0]!.data);
        expect(second[1]!.data).not.toBe(first[1]!.data);
    });

    it('preserves data shells for nodes still active', () => {
        const ref = makeRef();
        const nodes = [createIdeaNode('k', 'w1', { x: 0, y: 0 })];
        const first = buildRfNodes(nodes, emptySelection, ref);

        cleanupDataShells(new Set(['k']));

        const moved = { ...nodes[0]!, position: { x: 5, y: 5 } };
        const second = buildRfNodes([moved], emptySelection, ref);
        expect(second[0]!.data).toBe(first[0]!.data);
    });

    it('handles empty activeIds by removing all shells', () => {
        const ref = makeRef();
        const node = createIdeaNode('z', 'w1', { x: 0, y: 0 });
        const first = buildRfNodes([node], emptySelection, ref);

        cleanupDataShells(new Set());

        const moved = { ...node, position: { x: 1, y: 1 } };
        const second = buildRfNodes([moved], emptySelection, ref);
        expect(second[0]!.data).not.toBe(first[0]!.data);
        expect(second[0]!.data).toEqual({ id: 'z' });
    });

    it('is safe to call repeatedly without leaks', () => {
        const ref = makeRef();
        for (let i = 0; i < 10; i++) {
            const node = createIdeaNode(`tmp-${i}`, 'w1', { x: i, y: i });
            buildRfNodes([node], emptySelection, ref);
        }
        cleanupDataShells(new Set(['tmp-5']));
        cleanupDataShells(new Set(['tmp-5']));

        const node = createIdeaNode('tmp-5', 'w1', { x: 99, y: 99 });
        const result = buildRfNodes([node], emptySelection, ref);
        expect(result[0]!.data).toEqual({ id: 'tmp-5' });
    });
});
