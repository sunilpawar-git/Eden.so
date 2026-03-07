import { describe, test, expect } from 'vitest';
import { branchToMarkdown } from '../markdownExporter';
import { exportStrings } from '../../strings/exportStrings';
import type { BranchNode } from '../branchTraversal';

function makeBranch(overrides: Partial<BranchNode> = {}): BranchNode {
    return {
        id: 'n1',
        heading: 'Test Heading',
        content: 'Test content',
        attachments: [],
        tags: [],
        children: [],
        depth: 0,
        isSynthesis: false,
        synthesisSourceCount: 0,
        ...overrides,
    };
}

describe('branchToMarkdown', () => {
    test('single root with heading + content produces # Heading and content', () => {
        const md = branchToMarkdown([makeBranch()]);
        expect(md).toContain('# Test Heading');
        expect(md).toContain('Test content');
    });

    test('two-level tree produces ## for child', () => {
        const root = makeBranch({
            children: [makeBranch({ id: 'c1', heading: 'Child', content: 'Child text', depth: 1 })],
        });
        const md = branchToMarkdown([root]);
        expect(md).toContain('# Test Heading');
        expect(md).toContain('## Child');
    });

    test('three-level tree produces ### for grandchild', () => {
        const root = makeBranch({
            children: [
                makeBranch({
                    id: 'c1', heading: 'Child', depth: 1,
                    children: [makeBranch({ id: 'gc1', heading: 'Grandchild', depth: 2 })],
                }),
            ],
        });
        const md = branchToMarkdown([root]);
        expect(md).toContain('### Grandchild');
    });

    test('depth > 5 clamps to ######', () => {
        const deep = makeBranch({ heading: 'Deep', depth: 8 });
        const md = branchToMarkdown([deep]);
        expect(md).toContain('###### Deep');
        expect(md).not.toContain('####### ');
    });

    test('empty heading produces no heading line, just content', () => {
        const md = branchToMarkdown([makeBranch({ heading: '' })]);
        expect(md).not.toContain('# ');
        expect(md).toContain('Test content');
    });

    test('empty content produces heading only, no blank content', () => {
        const md = branchToMarkdown([makeBranch({ content: '' })]);
        expect(md).toContain('# Test Heading');
        const lines = md.split('\n');
        const headingIdx = lines.findIndex((l) => l.includes('# Test Heading'));
        expect(lines[headingIdx + 1]).toBe('');
    });

    test('attachments render with filename and summary', () => {
        const md = branchToMarkdown([makeBranch({
            attachments: [{ filename: 'doc.pdf', summary: 'Summary of doc' }],
        })]);
        expect(md).toContain(`**${exportStrings.sections.attachments}:**`);
        expect(md).toContain('- doc.pdf \u2014 Summary of doc');
    });

    test('tags render as comma-separated list', () => {
        const md = branchToMarkdown([makeBranch({ tags: ['research', 'finance'] })]);
        expect(md).toContain(`**${exportStrings.sections.tags}:** research, finance`);
    });

    test('multi-root separates trees with ---', () => {
        const root1 = makeBranch({ heading: 'First' });
        const root2 = makeBranch({ id: 'n2', heading: 'Second' });
        const md = branchToMarkdown([root1, root2]);
        const parts = md.split('---');
        expect(parts.length).toBeGreaterThanOrEqual(3);
    });

    test('footer contains attribution string from exportStrings', () => {
        const md = branchToMarkdown([makeBranch()]);
        expect(md).toContain(exportStrings.sections.generatedBy);
    });

    test('synthesis node heading prefixed with [Synthesis]', () => {
        const md = branchToMarkdown([makeBranch({ isSynthesis: true, heading: 'Summary' })]);
        expect(md).toContain('# [Synthesis] Summary');
    });

    test('synthesis node shows synthesized from N ideas subtitle', () => {
        const md = branchToMarkdown([makeBranch({
            isSynthesis: true,
            synthesisSourceCount: 5,
        })]);
        expect(md).toContain(`*${exportStrings.sections.synthesizedFrom} 5 ${exportStrings.sections.ideas}*`);
    });

    test('regular node has no synthesis prefix', () => {
        const md = branchToMarkdown([makeBranch({ heading: 'Normal' })]);
        expect(md).not.toContain('[Synthesis]');
    });

    test('all section labels come from exportStrings', () => {
        const md = branchToMarkdown([makeBranch({
            isSynthesis: true,
            synthesisSourceCount: 3,
            attachments: [{ filename: 'f.pdf', summary: 's' }],
            tags: ['t'],
        })]);
        expect(md).toContain(exportStrings.sections.attachments);
        expect(md).toContain(exportStrings.sections.tags);
        expect(md).toContain(exportStrings.sections.synthesizedFrom);
        expect(md).toContain(exportStrings.sections.generatedBy);
    });

    test('exporter does not generate HTML tags (user content passed as-is)', () => {
        const md = branchToMarkdown([makeBranch({
            heading: 'Clean',
            content: 'Plain text only',
            tags: ['tag1'],
            attachments: [{ filename: 'f.pdf', summary: 'sum' }],
        })]);
        const exporterGenerated = md
            .replace('Plain text only', '')
            .replace('Clean', '')
            .replace('tag1', '')
            .replace('f.pdf', '')
            .replace('sum', '');
        expect(exporterGenerated).not.toMatch(/<[a-z][\s\S]*>/i);
    });

    test('empty tree returns empty string', () => {
        expect(branchToMarkdown([])).toBe('');
    });
});
