import { describe, test, expect } from 'vitest';
import { buildSynthesisPrompt } from '../synthesisPrompts';
import type { SynthesisGraph } from '../subgraphTraversal';
import { synthesisStrings } from '../../strings/synthesisStrings';

function makeGraph(overrides: Partial<SynthesisGraph> = {}): SynthesisGraph {
    return {
        roots: [
            { id: 'A', heading: 'Root', content: 'Root content', attachmentSummary: '', depth: 0, childIds: ['B'] },
        ],
        rootIds: ['A'],
        allNodes: [
            { id: 'A', heading: 'Root', content: 'Root content', attachmentSummary: '', depth: 0, childIds: ['B'] },
            {
                id: 'B',
                heading: 'Child',
                content: 'Child content',
                attachmentSummary: '',
                depth: 1,
                childIds: [],
            },
        ],
        totalTokenEstimate: 20,
        ...overrides,
    };
}

describe('buildSynthesisPrompt', () => {
    test('summarize mode contains summarizeInstruction', () => {
        const prompt = buildSynthesisPrompt(makeGraph(), 'summarize');
        expect(prompt).toContain(synthesisStrings.prompts.summarizeInstruction);
    });

    test('outline mode contains outlineInstruction', () => {
        const prompt = buildSynthesisPrompt(makeGraph(), 'outline');
        expect(prompt).toContain(synthesisStrings.prompts.outlineInstruction);
    });

    test('narrative mode contains narrativeInstruction', () => {
        const prompt = buildSynthesisPrompt(makeGraph(), 'narrative');
        expect(prompt).toContain(synthesisStrings.prompts.narrativeInstruction);
    });

    test('questions mode contains questionsInstruction', () => {
        const prompt = buildSynthesisPrompt(makeGraph(), 'questions');
        expect(prompt).toContain(synthesisStrings.prompts.questionsInstruction);
    });

    test('node headings appear in quotes', () => {
        const prompt = buildSynthesisPrompt(makeGraph(), 'summarize');
        expect(prompt).toContain('"Root"');
        expect(prompt).toContain('"Child"');
    });

    test('depth indentation is correct (2 spaces per level)', () => {
        const prompt = buildSynthesisPrompt(makeGraph(), 'summarize');
        const lines = prompt.split('\n');
        const childLine = lines.find((l) => l.includes('"Child"'));
        expect(childLine).toBeDefined();
        expect(childLine!.startsWith('  ')).toBe(true);
    });

    test('children listed with elaborates on parent reference', () => {
        const prompt = buildSynthesisPrompt(makeGraph(), 'summarize');
        expect(prompt).toContain(synthesisStrings.prompts.childrenNote);
    });

    test('attachment summary included when present', () => {
        const graph = makeGraph({
            allNodes: [
                {
                    id: 'A',
                    heading: 'Root',
                    content: 'Content',
                    attachmentSummary: 'Document analysis here',
                    depth: 0,
                    childIds: [],
                },
            ],
            roots: [
                {
                    id: 'A',
                    heading: 'Root',
                    content: 'Content',
                    attachmentSummary: 'Document analysis here',
                    depth: 0,
                    childIds: [],
                },
            ],
        });
        const prompt = buildSynthesisPrompt(graph, 'summarize');
        expect(prompt).toContain('Attachment: Document analysis here');
    });

    test('empty content/attachment sections are omitted', () => {
        const graph = makeGraph({
            allNodes: [
                { id: 'A', heading: 'Root', content: '', attachmentSummary: '', depth: 0, childIds: [] },
            ],
            roots: [
                { id: 'A', heading: 'Root', content: '', attachmentSummary: '', depth: 0, childIds: [] },
            ],
        });
        const prompt = buildSynthesisPrompt(graph, 'summarize');
        expect(prompt).not.toContain('Content:');
        expect(prompt).not.toContain('Attachment:');
    });

    test('all strings sourced from synthesisStrings', () => {
        const prompt = buildSynthesisPrompt(makeGraph(), 'summarize');
        expect(prompt).toContain(synthesisStrings.prompts.contextPrefix);
        expect(prompt).toContain(synthesisStrings.prompts.nodeTemplate);
        expect(prompt).toContain(synthesisStrings.prompts.depthLabel);
    });

    test('large graph prompt is truncated under MAX_PROMPT_CHARS', () => {
        const bigNodes = Array.from({ length: 50 }, (_, i) => ({
            id: `N${i}`,
            heading: `Heading ${i}`,
            content: 'x'.repeat(2000),
            attachmentSummary: '',
            depth: 0,
            childIds: [],
        }));
        const graph: SynthesisGraph = {
            roots: [bigNodes[0]!],
            rootIds: ['N0'],
            allNodes: bigNodes,
            totalTokenEstimate: 25000,
        };
        const prompt = buildSynthesisPrompt(graph, 'narrative');
        expect(prompt.length).toBeLessThanOrEqual(100_000);
    });
});
