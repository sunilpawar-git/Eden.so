/**
 * buildRfEdges — Structural sharing tests for ReactFlow edge objects.
 *
 * buildRfEdges reuses previous Edge objects when the underlying CanvasEdge
 * hasn't changed, making the common case O(1) identity checks vs O(E) allocations.
 */
import { describe, it, expect } from 'vitest';
import { buildRfEdges, type PrevRfEdges } from '../buildRfEdges';
import { EDGE_TYPE_DELETABLE } from '../canvasViewConstants';
import type { CanvasEdge } from '../../types/edge';

function makeEdge(id: string, src: string, tgt: string, rel: 'related' | 'derived' = 'related'): CanvasEdge {
    return { id, workspaceId: 'ws-1', sourceNodeId: src, targetNodeId: tgt, relationshipType: rel };
}

function emptyRef(): { current: PrevRfEdges } {
    return { current: { arr: [], map: new Map() } };
}

describe('buildRfEdges (structural sharing)', () => {
    it('maps CanvasEdge[] to RF Edge[] correctly', () => {
        const ref = emptyRef();
        const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c', 'derived')];
        const result = buildRfEdges(edges, ref);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ id: 'e1', source: 'a', target: 'b', type: EDGE_TYPE_DELETABLE, animated: false });
        expect(result[1]).toMatchObject({ id: 'e2', source: 'b', target: 'c', type: EDGE_TYPE_DELETABLE, animated: true });
    });

    it('returns same array reference when edges unchanged', () => {
        const ref = emptyRef();
        const edges = [makeEdge('e1', 'a', 'b')];
        const first = buildRfEdges(edges, ref);
        const second = buildRfEdges(edges, ref);

        expect(second).toBe(first);
    });

    it('reuses unchanged Edge objects when one edge added', () => {
        const ref = emptyRef();
        const edges1 = [makeEdge('e1', 'a', 'b')];
        const result1 = buildRfEdges(edges1, ref);

        const edges2 = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')];
        const result2 = buildRfEdges(edges2, ref);

        expect(result2).not.toBe(result1);
        expect(result2[0]).toBe(result1[0]);
        expect(result2).toHaveLength(2);
    });

    it('reuses unchanged Edge objects when one edge removed', () => {
        const ref = emptyRef();
        const edges1 = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')];
        const result1 = buildRfEdges(edges1, ref);

        const edges2 = [makeEdge('e1', 'a', 'b')];
        const result2 = buildRfEdges(edges2, ref);

        expect(result2).not.toBe(result1);
        expect(result2[0]).toBe(result1[0]);
    });

    it('produces new Edge object when source changes', () => {
        const ref = emptyRef();
        const edges1 = [makeEdge('e1', 'a', 'b')];
        const result1 = buildRfEdges(edges1, ref);

        const edges2 = [makeEdge('e1', 'x', 'b')];
        const result2 = buildRfEdges(edges2, ref);

        expect(result2[0]).not.toBe(result1[0]);
        expect(result2[0]!.source).toBe('x');
    });

    it('produces new Edge object when relationshipType changes', () => {
        const ref = emptyRef();
        const edges1 = [makeEdge('e1', 'a', 'b', 'related')];
        const result1 = buildRfEdges(edges1, ref);

        const edges2 = [makeEdge('e1', 'a', 'b', 'derived')];
        const result2 = buildRfEdges(edges2, ref);

        expect(result2[0]).not.toBe(result1[0]);
        expect(result2[0]!.animated).toBe(true);
    });

    it('returns empty array for empty input', () => {
        const ref = emptyRef();
        expect(buildRfEdges([], ref)).toEqual([]);
    });

    it('detects reorder and returns new array (prevArr[index] !== prev guard)', () => {
        const ref = emptyRef();
        const edges1 = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')];
        const result1 = buildRfEdges(edges1, ref);

        const edges2 = [makeEdge('e2', 'b', 'c'), makeEdge('e1', 'a', 'b')];
        const result2 = buildRfEdges(edges2, ref);

        expect(result2).not.toBe(result1);
        expect(result2[0]).toBe(result1[1]);
        expect(result2[1]).toBe(result1[0]);
    });

    it('handles duplicate edge IDs (second call reuses from map)', () => {
        const ref = emptyRef();
        const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e1', 'a', 'b')];
        buildRfEdges(edges, ref);
        const result2 = buildRfEdges(edges, ref);

        expect(result2).toHaveLength(2);
        expect(result2[0]).toBe(result2[1]);
    });
});
