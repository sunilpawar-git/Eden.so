import { describe, test, expect } from 'vitest';
import { collectBranch, collectMultiRootBranch } from '../services/branchTraversal';
import { branchToMarkdown } from '../services/markdownExporter';
import { exportStrings } from '../strings/exportStrings';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

function makeNode(id: string, overrides: Partial<CanvasNode['data']> = {}): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        data: { heading: `Heading ${id}`, output: `Content ${id}`, colorKey: 'default', ...overrides },
        position: { x: 0, y: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function makeEdge(src: string, tgt: string): CanvasEdge {
    return { id: `e-${src}-${tgt}`, workspaceId: 'ws-1', sourceNodeId: src, targetNodeId: tgt, relationshipType: 'related' };
}

describe('Export end-to-end', () => {
    test('3-node tree → branchToMarkdown → expected markdown structure', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')];
        const root = collectBranch('A', nodes, edges)!;
        const md = branchToMarkdown([root]);

        expect(md).toContain('# Heading A');
        expect(md).toContain('Content A');
        expect(md).toContain('## Heading B');
        expect(md).toContain('Content B');
        expect(md).toContain('### Heading C');
        expect(md).toContain('Content C');
        expect(md).toContain(exportStrings.sections.generatedBy);
    });

    test('branch with synthesis node → synthesis formatting applied', () => {
        const nodes = [
            makeNode('A'),
            makeNode('B'),
            makeNode('S', {
                heading: 'Strategy Summary',
                output: 'Synthesized insight',
                colorKey: 'synthesis',
                synthesisSourceIds: ['x', 'y', 'z'],
            }),
        ];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'S')];
        const root = collectBranch('A', nodes, edges)!;
        const md = branchToMarkdown([root]);

        expect(md).toContain('[Synthesis] Strategy Summary');
        expect(md).toContain(`${exportStrings.sections.synthesizedFrom} 3 ${exportStrings.sections.ideas}`);
        expect(md).toContain('Synthesized insight');
    });

    test('multi-root flow: 2 disconnected trees → both in export with separator', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
        const edges = [makeEdge('A', 'B'), makeEdge('C', 'D')];
        const selected = new Set(['A', 'B', 'C', 'D']);
        const roots = collectMultiRootBranch(selected, nodes, edges);
        const md = branchToMarkdown(roots);

        expect(roots).toHaveLength(2);
        expect(md).toContain('Heading A');
        expect(md).toContain('Heading C');

        const separatorCount = (md.match(/^---$/gm) ?? []).length;
        expect(separatorCount).toBeGreaterThanOrEqual(2);
    });

    test('diamond DAG → cross-reference inserted for second path', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
        const edges = [makeEdge('A', 'B'), makeEdge('A', 'C'), makeEdge('B', 'D'), makeEdge('C', 'D')];
        const root = collectBranch('A', nodes, edges)!;
        const md = branchToMarkdown([root]);

        expect(md).toContain('Content D');
        expect(md).toContain(exportStrings.sections.seeAbove);
    });

    test('empty selection → empty markdown', () => {
        const roots = collectMultiRootBranch(new Set(), [], []);
        const md = branchToMarkdown(roots);
        expect(md).toBe('');
    });

    test('node with tags and attachments → all sections rendered', () => {
        const nodes = [makeNode('A', {
            tags: ['research', 'Q4'],
            attachments: [{
                filename: 'report.pdf',
                url: 'https://storage/report.pdf',
                mimeType: 'application/pdf' as const,
                sizeBytes: 1024,
                extraction: {
                    classification: 'generic' as const,
                    confidence: 'high' as const,
                    summary: 'Quarterly analysis',
                    keyFacts: [],
                    actionItems: [],
                    questions: [],
                    extendedFacts: [],
                },
            }],
        })];
        const root = collectBranch('A', nodes, [])!;
        const md = branchToMarkdown([root]);

        expect(md).toContain(`**${exportStrings.sections.attachments}:**`);
        expect(md).toContain('report.pdf');
        expect(md).toContain('Quarterly analysis');
        expect(md).toContain(`**${exportStrings.sections.tags}:** research, Q4`);
    });

    test('4-level tree → correct heading depths', () => {
        const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'D')];
        const root = collectBranch('A', nodes, edges)!;
        const md = branchToMarkdown([root]);

        expect(md).toContain('# Heading A');
        expect(md).toContain('## Heading B');
        expect(md).toContain('### Heading C');
        expect(md).toContain('#### Heading D');
    });
});
