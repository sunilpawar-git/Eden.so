/**
 * Synthesis Prompt Builder — constructs structured Gemini prompts from a SynthesisGraph.
 * All user-facing labels sourced from synthesisStrings.
 *
 * Security: Node heading, content, and attachmentSummary are user-authored strings
 * interpolated into the prompt. This matches the existing pattern in documentAgentPrompts.ts
 * and geminiService.ts. Prompt-injection risk is mitigated because:
 *   1. AI output is rendered as markdown (not executed as code)
 *   2. No Gemini tool-use or function-calling is enabled
 * If function-calling is added in the future, all prompt builders need input sanitization.
 */
import { synthesisStrings } from '../strings/synthesisStrings';
import type { SynthesisGraph, SynthesisNode } from './subgraphTraversal';

export type SynthesisMode = 'summarize' | 'outline' | 'narrative' | 'questions';

const MODE_INSTRUCTIONS: Record<SynthesisMode, string> = {
    summarize: synthesisStrings.prompts.summarizeInstruction,
    outline: synthesisStrings.prompts.outlineInstruction,
    narrative: synthesisStrings.prompts.narrativeInstruction,
    questions: synthesisStrings.prompts.questionsInstruction,
};

const MAX_PROMPT_CHARS = 100_000;

function formatNode(
    node: SynthesisNode,
    index: number,
    allNodes: readonly SynthesisNode[],
    parentIndex?: number
): string {
    const indent = '  '.repeat(node.depth);
    const { nodeTemplate, depthLabel, childrenNote } = synthesisStrings.prompts;
    const parentRef =
        parentIndex !== undefined ? `, ${childrenNote} ${nodeTemplate} ${parentIndex + 1}` : '';
    const header = `${indent}${nodeTemplate} ${index + 1} (${depthLabel} ${node.depth}${parentRef}): "${node.heading}"`;

    const lines = [header];
    if (node.content) {
        lines.push(`${indent}  Content: ${node.content}`);
    }
    if (node.attachmentSummary) {
        lines.push(`${indent}  Attachment: ${node.attachmentSummary}`);
    }
    if (node.childIds.length > 0) {
        const childRefs = node.childIds
            .map((cid) => {
                const cidx = allNodes.findIndex((n) => n.id === cid);
                return cidx >= 0 ? `${nodeTemplate} ${cidx + 1}` : '';
            })
            .filter(Boolean)
            .join(', ');
        if (childRefs) {
            lines.push(`${indent}  → Children: ${childRefs}`);
        }
    }
    return lines.join('\n');
}

export function buildSynthesisPrompt(
    graph: SynthesisGraph,
    mode: SynthesisMode
): string {
    const instruction = MODE_INSTRUCTIONS[mode];
    const parentMap = buildParentMap(graph);

    const nodeBlocks = graph.allNodes.map((node, idx) => {
        const parentIdx = parentMap.get(node.id);
        return formatNode(node, idx, graph.allNodes, parentIdx);
    });

    const prompt = [
        instruction,
        '',
        synthesisStrings.prompts.contextPrefix,
        '',
        ...nodeBlocks,
    ].join('\n');

    if (prompt.length > MAX_PROMPT_CHARS) {
        return prompt.slice(0, MAX_PROMPT_CHARS);
    }
    return prompt;
}

function buildParentMap(graph: SynthesisGraph): Map<string, number> {
    const parentMap = new Map<string, number>();
    for (let i = 0; i < graph.allNodes.length; i++) {
        const node = graph.allNodes[i];
        if (node === undefined) continue;
        for (const childId of node.childIds) {
            if (!parentMap.has(childId)) {
                parentMap.set(childId, i);
            }
        }
    }
    return parentMap;
}
