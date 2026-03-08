import { describe, test, expect } from 'vitest';
import { buildSynthesisGraph } from '../subgraphTraversal';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

function makeNode(id: string, overrides: Partial<CanvasNode['data']> = {}): CanvasNode {
    const now = new Date();
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        data: { heading: `Heading ${id}`, output: `Output ${id}`, ...overrides },
        position: { x: 0, y: 0 },
        width: 280,
        height: 220,
        createdAt: now,
        updatedAt: now,
    };
}

function makeEdge(source: string, target: string): CanvasEdge {
    return {
        id: `edge-${source}-${target}`,
        workspaceId: 'ws-1',
        sourceNodeId: source,
        targetNodeId: target,
        relationshipType: 'related',
    };
}

describe('buildSynthesisGraph', () => {
    test('single node selection returns graph with 1 root at depth 0', () => {
        const nodes = [makeNode('A')];
        const graph = buildSynthesisGraph(new Set(['A']), nodes, []);

        expect(graph.roots).toHaveLength(1);
        expect(graph.allNodes).toHaveLength(1);
        expect(graph.roots[0]!.id).toBe('A');
        expect(graph.roots[0]!.depth).toBe(0);
    });

    test('linear chain A→B→C assigns correct depths', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')];
        const graph = buildSynthesisGraph(new Set(['A', 'B', 'C']), nodes, edges);

        expect(graph.rootIds).toEqual(['A']);
        const nodeById = (id: string) => graph.allNodes.find((n) => n.id === id);
        expect(nodeById('A')!.depth).toBe(0);
        expect(nodeById('B')!.depth).toBe(1);
        expect(nodeById('C')!.depth).toBe(2);
    });

    test('diamond A→B, A→C, B→D, C→D visits D once with correct depth', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
        const edges = [makeEdge('A', 'B'), makeEdge('A', 'C'), makeEdge('B', 'D'), makeEdge('C', 'D')];
        const graph = buildSynthesisGraph(new Set(['A', 'B', 'C', 'D']), nodes, edges);

        const dNodes = graph.allNodes.filter((n) => n.id === 'D');
        expect(dNodes).toHaveLength(1);
        expect(dNodes[0]!.depth).toBe(2);
    });

    test('cycle A→B→C→A picks highest-outdegree node as root without infinite loop', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'A')];
        const graph = buildSynthesisGraph(new Set(['A', 'B', 'C']), nodes, edges);

        expect(graph.roots.length).toBeGreaterThanOrEqual(1);
        expect(graph.allNodes).toHaveLength(3);
    });

    test('disconnected clusters produce two roots', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
        const edges = [makeEdge('A', 'B'), makeEdge('C', 'D')];
        const graph = buildSynthesisGraph(new Set(['A', 'B', 'C', 'D']), nodes, edges);

        expect(graph.rootIds).toContain('A');
        expect(graph.rootIds).toContain('C');
    });

    test('node with no heading or output produces empty strings', () => {
        const nodes = [makeNode('A', { heading: undefined, output: undefined })];
        const graph = buildSynthesisGraph(new Set(['A']), nodes, []);

        expect(graph.allNodes[0]!.heading).toBe('');
        expect(graph.allNodes[0]!.content).toBe('');
    });

    test('nodes outside selection are ignored even if edges connect to them', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')];
        const graph = buildSynthesisGraph(new Set(['A', 'B']), nodes, edges);

        expect(graph.allNodes).toHaveLength(2);
        expect(graph.allNodes.map((n) => n.id).sort()).toEqual(['A', 'B']);
    });

    test('token estimate matches expected calculation', () => {
        const nodes = [makeNode('A', { heading: 'abcd', output: '12345678' })];
        const graph = buildSynthesisGraph(new Set(['A']), nodes, []);

        const expected = Math.ceil((4 + 8 + 0) / 4);
        expect(graph.totalTokenEstimate).toBe(expected);
    });

    test('empty selection returns empty graph', () => {
        const graph = buildSynthesisGraph(new Set(), [], []);

        expect(graph.roots).toEqual([]);
        expect(graph.allNodes).toEqual([]);
        expect(graph.rootIds).toEqual([]);
        expect(graph.totalTokenEstimate).toBe(0);
    });

    test('node with attachment extraction populates attachmentSummary', () => {
        const nodes = [
            makeNode('A', {
                attachments: [
                    {
                        filename: 'doc.pdf',
                        url: 'https://example.com/doc.pdf',
                        mimeType: 'application/pdf' as const,
                        sizeBytes: 1000,
                        extraction: {
                            classification: 'report' as const,
                            confidence: 'high' as const,
                            summary: 'This is a summary',
                            keyFacts: [],
                            actionItems: [],
                            questions: [],
                            extendedFacts: [],
                        },
                    },
                ],
            }),
        ];
        const graph = buildSynthesisGraph(new Set(['A']), nodes, []);

        expect(graph.allNodes[0]!.attachmentSummary).toBe('This is a summary');
    });

    test('rootIds contains exactly the root node IDs', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
        const edges = [makeEdge('A', 'B'), makeEdge('A', 'C')];
        const graph = buildSynthesisGraph(new Set(['A', 'B', 'C']), nodes, edges);

        expect(graph.rootIds).toEqual(['A']);
    });

    test('synthesis node in selection is treated like any other node', () => {
        const nodes = [
            makeNode('S', { heading: 'Synthesis of 3 ideas', output: 'Synthesized content', colorKey: 'default' }),
            makeNode('D'),
        ];
        const edges = [makeEdge('S', 'D')];
        const graph = buildSynthesisGraph(new Set(['S', 'D']), nodes, edges);

        expect(graph.rootIds).toEqual(['S']);
        const sNode = graph.allNodes.find((n) => n.id === 'S')!;
        expect(sNode.heading).toBe('Synthesis of 3 ideas');
        expect(sNode.content).toBe('Synthesized content');
    });
});
