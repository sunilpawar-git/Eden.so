import { describe, test, expect } from 'vitest';
import { collectBranch, collectMultiRootBranch } from '../branchTraversal';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

function makeNode(id: string, overrides: Partial<CanvasNode['data']> = {}): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        data: {
            heading: `Heading ${id}`,
            output: `Content ${id}`,
            colorKey: 'default',
            ...overrides,
        },
        position: { x: 0, y: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function makeEdge(source: string, target: string): CanvasEdge {
    return { id: `e-${source}-${target}`, workspaceId: 'ws-1', sourceNodeId: source, targetNodeId: target, relationshipType: 'related' };
}

describe('collectBranch', () => {
    test('single node (no children) returns leaf BranchNode with depth 0', () => {
        const nodes = [makeNode('A')];
        const result = collectBranch('A', nodes, []);
        expect(result).not.toBeNull();
        expect(result!.id).toBe('A');
        expect(result!.depth).toBe(0);
        expect(result!.children).toEqual([]);
    });

    test('linear chain A→B→C builds correct tree', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')];
        const result = collectBranch('A', nodes, edges)!;
        expect(result.children).toHaveLength(1);
        expect(result.children[0]!.id).toBe('B');
        expect(result.children[0]!.children[0]!.id).toBe('C');
    });

    test('branching A→B, A→C gives A two children', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
        const edges = [makeEdge('A', 'B'), makeEdge('A', 'C')];
        const result = collectBranch('A', nodes, edges)!;
        expect(result.children).toHaveLength(2);
        const childIds = result.children.map((c) => c.id).sort();
        expect(childIds).toEqual(['B', 'C']);
    });

    test('cycle A→B→A stops via visited guard', () => {
        const nodes = [makeNode('A'), makeNode('B')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'A')];
        const result = collectBranch('A', nodes, edges)!;
        expect(result.children).toHaveLength(1);
        expect(result.children[0]!.id).toBe('B');
        expect(result.children[0]!.children).toHaveLength(1);
        expect(result.children[0]!.children[0]!.content).toBe('(see above)');
    });

    test('diamond A→B→D, A→C→D inserts cross-reference for D under C', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
        const edges = [makeEdge('A', 'B'), makeEdge('A', 'C'), makeEdge('B', 'D'), makeEdge('C', 'D')];
        const result = collectBranch('A', nodes, edges)!;

        const bChild = result.children.find((c) => c.id === 'B')!;
        const cChild = result.children.find((c) => c.id === 'C')!;

        expect(bChild.children).toHaveLength(1);
        expect(bChild.children[0]!.id).toBe('D');
        expect(bChild.children[0]!.content).toBe('Content D');

        expect(cChild.children).toHaveLength(1);
        expect(cChild.children[0]!.id).toBe('D');
        expect(cChild.children[0]!.content).toBe('(see above)');
    });

    test('root not found returns null', () => {
        const result = collectBranch('nonexistent', [], []);
        expect(result).toBeNull();
    });

    test('node with no heading defaults to empty string', () => {
        const nodes = [makeNode('A', { heading: undefined, prompt: undefined })];
        const result = collectBranch('A', nodes, [])!;
        expect(result.heading).toBe('');
    });

    test('node with no output defaults to empty string', () => {
        const nodes = [makeNode('A', { output: undefined })];
        const result = collectBranch('A', nodes, [])!;
        expect(result.content).toBe('');
    });

    test('node with attachments populates AttachmentExport with extraction summary', () => {
        const nodes = [makeNode('A', {
            attachments: [{
                filename: 'doc.pdf',
                url: 'https://storage.test/doc.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                extraction: {
                    classification: 'generic',
                    confidence: 'medium',
                    summary: 'A summary of the doc',
                    keyFacts: [],
                    actionItems: [],
                    questions: [],
                    extendedFacts: [],
                },
            }],
        })];
        const result = collectBranch('A', nodes, [])!;
        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0]!.filename).toBe('doc.pdf');
        expect(result.attachments[0]!.summary).toBe('A summary of the doc');
    });

    test('node with tags populates tags array', () => {
        const nodes = [makeNode('A', { tags: ['research', 'finance'] })];
        const result = collectBranch('A', nodes, [])!;
        expect(result.tags).toEqual(['research', 'finance']);
    });

    test('depth assigned correctly in 4-level tree', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'D')];
        const result = collectBranch('A', nodes, edges)!;
        expect(result.depth).toBe(0);
        expect(result.children[0]!.depth).toBe(1);
        expect(result.children[0]!.children[0]!.depth).toBe(2);
        expect(result.children[0]!.children[0]!.children[0]!.depth).toBe(3);
    });

    test('synthesis node sets isSynthesis=true and synthesisSourceCount', () => {
        const nodes = [makeNode('A', {
            colorKey: 'synthesis',
            synthesisSourceIds: ['x', 'y', 'z'],
        })];
        const result = collectBranch('A', nodes, [])!;
        expect(result.isSynthesis).toBe(true);
        expect(result.synthesisSourceCount).toBe(3);
    });

    test('regular node sets isSynthesis=false, synthesisSourceCount=0', () => {
        const nodes = [makeNode('A')];
        const result = collectBranch('A', nodes, [])!;
        expect(result.isSynthesis).toBe(false);
        expect(result.synthesisSourceCount).toBe(0);
    });

    test('attachment with no extraction omits from list (empty summary)', () => {
        const nodes = [makeNode('A', {
            attachments: [{
                filename: 'doc.pdf',
                url: 'https://storage.test/doc.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
            }],
        })];
        const result = collectBranch('A', nodes, [])!;
        expect(result.attachments).toHaveLength(0);
    });
});

describe('collectMultiRootBranch', () => {
    test('two disconnected trees return both roots', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
        const edges = [makeEdge('A', 'B'), makeEdge('C', 'D')];
        const selected = new Set(['A', 'B', 'C', 'D']);
        const result = collectMultiRootBranch(selected, nodes, edges);
        expect(result).toHaveLength(2);
        const rootIds = result.map((r) => r.id).sort();
        expect(rootIds).toEqual(['A', 'C']);
    });

    test('nodes outside selection excluded', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')];
        const selected = new Set(['A', 'B']);
        const result = collectMultiRootBranch(selected, nodes, edges);
        expect(result).toHaveLength(1);
        expect(result[0]!.children).toHaveLength(1);
        expect(result[0]!.children[0]!.children).toHaveLength(0);
    });

    test('empty selection returns empty array', () => {
        const result = collectMultiRootBranch(new Set(), [], []);
        expect(result).toEqual([]);
    });
});
