/**
 * Synthesis execution — builds graph, calls Gemini, creates synthesis node + edges.
 * Extracted from useSynthesis to keep the hook under 75 lines.
 */
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { generateContentWithContext } from '@/features/ai/services/geminiService';
import type { KBGenerationType } from '@/features/knowledgeBank/types/knowledgeBank';
import { buildSynthesisGraph } from './subgraphTraversal';
import { buildSynthesisPrompt, type SynthesisMode } from './synthesisPrompts';
import { createSynthesisNode, createSynthesisEdges } from './synthesisNodeFactory';
import { calculateSynthesisPosition } from './synthesisPosition';
import { synthesisStrings } from '../strings/synthesisStrings';

export type KBContextFn = (prompt?: string, generationType?: KBGenerationType) => string;

/**
 * Build a subgraph from the current selection, send it to Gemini, and create a new synthesis node.
 * @throws {Error} If `generateContentWithContext` rejects (network, quota, or model error).
 */
export async function executeSynthesis(
    mode: SynthesisMode,
    workspaceId: string,
    getKBContext: KBContextFn
): Promise<void> {
    const { selectedNodeIds, nodes, edges } = useCanvasStore.getState();
    if (selectedNodeIds.size < 2) return;

    const graph = buildSynthesisGraph(selectedNodeIds, nodes, edges);
    if (graph.allNodes.length === 0) return;

    const prompt = buildSynthesisPrompt(graph, mode);
    const kbContext = getKBContext(prompt, 'synthesis');
    const content = await generateContentWithContext(prompt, [], '', kbContext);

    const position = calculateSynthesisPosition(nodes, selectedNodeIds);
    const heading = `${synthesisStrings.labels.synthesisOf} ${graph.allNodes.length} ${synthesisStrings.labels.ideas}`;
    const newNode = createSynthesisNode({
        workspaceId,
        position,
        heading,
        output: content,
        sourceNodeIds: Array.from(selectedNodeIds),
        mode,
    });
    const newEdges = createSynthesisEdges(workspaceId, graph.rootIds, newNode.id);

    useCanvasStore.setState((s) => ({
        nodes: [...s.nodes, newNode],
        edges: [...s.edges, ...newEdges],
    }));
}
