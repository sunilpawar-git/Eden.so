import { describe, test, expect } from 'vitest';
import { createSynthesisNode, createSynthesisEdges } from '../synthesisNodeFactory';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('createSynthesisNode', () => {
    const params = {
        workspaceId: 'ws-1',
        position: { x: 100, y: 200 },
        heading: 'Synthesis of 3 ideas',
        output: 'Synthesized content here',
        sourceNodeIds: ['A', 'B', 'C'],
        mode: 'summarize' as const,
    };

    test('creates node with colorKey synthesis', () => {
        const node = createSynthesisNode(params);
        expect(node.data.colorKey).toBe('synthesis');
    });

    test('creates node with correct heading and output', () => {
        const node = createSynthesisNode(params);
        expect(node.data.heading).toBe('Synthesis of 3 ideas');
        expect(node.data.output).toBe('Synthesized content here');
    });

    test('creates node with synthesisSourceIds matching input', () => {
        const node = createSynthesisNode(params);
        expect(node.data.synthesisSourceIds).toEqual(['A', 'B', 'C']);
    });

    test('creates node with synthesisMode matching input', () => {
        const node = createSynthesisNode(params);
        expect(node.data.synthesisMode).toBe('summarize');
    });

    test('node id follows idea-uuid pattern', () => {
        const node = createSynthesisNode(params);
        expect(node.id).toMatch(/^idea-/);
        const uuid = node.id.replace('idea-', '');
        expect(uuid).toMatch(UUID_REGEX);
    });

    test('node position matches input', () => {
        const node = createSynthesisNode(params);
        expect(node.position).toEqual({ x: 100, y: 200 });
    });

    test('node workspaceId matches input', () => {
        const node = createSynthesisNode(params);
        expect(node.workspaceId).toBe('ws-1');
    });
});

describe('createSynthesisEdges', () => {
    test('creates N edges for N root IDs', () => {
        const edges = createSynthesisEdges('ws-1', ['R1', 'R2', 'R3'], 'synth-1');
        expect(edges).toHaveLength(3);
    });

    test('all edges have relationshipType derived', () => {
        const edges = createSynthesisEdges('ws-1', ['R1'], 'synth-1');
        expect(edges[0]!.relationshipType).toBe('derived');
    });

    test('all edge IDs follow edge-uuid pattern', () => {
        const edges = createSynthesisEdges('ws-1', ['R1', 'R2'], 'synth-1');
        for (const edge of edges) {
            expect(edge.id).toMatch(/^edge-/);
            const uuid = edge.id.replace('edge-', '');
            expect(uuid).toMatch(UUID_REGEX);
        }
    });

    test('all edges point from source roots to synthesis node', () => {
        const edges = createSynthesisEdges('ws-1', ['R1', 'R2'], 'synth-1');
        expect(edges[0]!.sourceNodeId).toBe('R1');
        expect(edges[0]!.targetNodeId).toBe('synth-1');
        expect(edges[1]!.sourceNodeId).toBe('R2');
        expect(edges[1]!.targetNodeId).toBe('synth-1');
    });
});
